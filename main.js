/* TODO:
goalies
tackles
move player towards tap
handleGoals
hot streak
difficulty slider
stagger and randomize order of bestSpot assignments
menu and scoreboard
polish
release
*/

const MILLISECONDS_PER_FRAME = 16
const PLAYER_RADIUS = 25
const BALL_RADIUS = 12.5
const GOAL_WIDTH = PLAYER_RADIUS * 6
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 3
const SLOW_SPEED = 0.005
const FAST_SPEED = 0.05
const FARNESS_THRESHOLD = PLAYER_RADIUS * 4
const FRAMES_BETWEEN_PLAYER_PATH_RESETS = 100
const SCREEN_WIDTH = visualViewport.width
const SCREEN_HEIGHT = visualViewport.height
const RED_TEAM_SHOT_TARGETS = [SCREEN_WIDTH / 2 + GOAL_WIDTH / 3, SCREEN_WIDTH / 3 - GOAL_WIDTH / 3]

let canvas;
let context;
let players = {
    blue: [
        {
            xPos: SCREEN_WIDTH * 0.5,
            yPos: SCREEN_HEIGHT * 0.5 + PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: SCREEN_WIDTH * 0.2,
            yPos: SCREEN_HEIGHT * 0.75,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: SCREEN_WIDTH * 0.8,
            yPos: SCREEN_HEIGHT * 0.75,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: SCREEN_WIDTH * 0.5,
            yPos: SCREEN_HEIGHT - PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        }

    ],
    red: [
        {
            xPos: SCREEN_WIDTH * 0.5,
            yPos: (SCREEN_HEIGHT * 0.5) - (PIXEL_SHIM * 3),
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: SCREEN_WIDTH * 0.2,
            yPos: SCREEN_HEIGHT * 0.25,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: SCREEN_WIDTH * 0.8,
            yPos: SCREEN_HEIGHT * 0.25,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: SCREEN_WIDTH * 0.5,
            yPos: PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
    ]
}
let ball = {
    radius: BALL_RADIUS,
    xPos: SCREEN_WIDTH * 0.5,
    yPos: SCREEN_HEIGHT * 0.5,
    xPosChangePerFrame: 0,
    yPosChangePerFrame: 0
}
let goals = {
    red: {
        xPos: (SCREEN_WIDTH - (PLAYER_RADIUS * 6)) / 2,
        yPos: 0
    },
    blue: {
        xPos: (SCREEN_WIDTH - (PLAYER_RADIUS * 6)) / 2,
        yPos: SCREEN_HEIGHT - PIXEL_SHIM
    }
}
let touch1 = {
    xPos: 0,
    yPos: 0
}
let touch2 = {
    xPos: 0,
    yPos: 0
}
let offensiveTeam = players.blue
let defensiveTeam = players.red
let sentPlayer = {}
let ballPossessor = {}
let sentPlayerFramesLeft = 0
let frameCount = 0
let isPaused = true
let isSendingBall = false
let isSendingPlayer = false
let hasBeenIntercepted = false

function initializeGame() {
    canvas = document.getElementById("canvas")
    canvas.width = SCREEN_WIDTH
    canvas.height = SCREEN_HEIGHT
    context = canvas.getContext('2d')
    document.addEventListener("touchstart", handleTouchstart)
    document.addEventListener("touchmove", handleTouchmove, {passive: false})
    gameLoop()
}

function handleTouchstart(event) {
    touch1.xPos = event.touches[0].clientX
    touch1.yPos = event.touches[0].clientY
    determineIfSendingPlayerOrBall()
}

function determineIfSendingPlayerOrBall() {
    isSendingBall = false
    isSendingPlayer = false
    for (let i = 0; i < players.blue.length; i++) {
        let bluePlayer = players.blue[i]
        let isTouchHorizontallyAlignedWithPlayer = (touch1.xPos > bluePlayer.xPos - PLAYER_RADIUS) && (touch1.xPos < bluePlayer.xPos + PLAYER_RADIUS)
        let isTouchVerticallyAlignedWithPlayer = (touch1.yPos > bluePlayer.yPos - PLAYER_RADIUS) && (touch1.yPos < bluePlayer.yPos + PLAYER_RADIUS)
        if (isTouchHorizontallyAlignedWithPlayer && isTouchVerticallyAlignedWithPlayer) {
            let isPlayerHorizontallyAlignedWithBall = Math.abs(bluePlayer.xPos - ball.xPos) <= PIXEL_SHIM
            let isPlayerVerticallyAlignedWithBall = Math.abs(bluePlayer.yPos - ball.yPos) <= PIXEL_SHIM
            if (isPlayerHorizontallyAlignedWithBall && isPlayerVerticallyAlignedWithBall) {
                isSendingBall = true
            }
            else {
                isSendingPlayer = true
                sentPlayer = bluePlayer
            }
        }
    }
}

function handleTouchmove(event) {
    event.preventDefault()
    touch2.xPos = event.touches[0].clientX
    touch2.yPos = event.touches[0].clientY
    if (isSendingBall) {
        setObjectTowardsSpotAtSpeed(ball, touch2, FAST_SPEED)
        isPaused = false
        ballPossessor = {}
        hasBeenIntercepted = false
    } else if (isSendingPlayer) {
        setObjectTowardsSpotAtSpeed(sentPlayer, touch2, FAST_SPEED)
        sentPlayerFramesLeft = FRAMES_PER_SENT_PLAYER
    }
}

function setObjectTowardsSpotAtSpeed(object, spot, speed) {
    object.xPosChangePerFrame = (spot.xPos - object.xPos) * speed
    object.yPosChangePerFrame = (spot.yPos - object.yPos) * speed
}

function gameLoop() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    drawGoals()
    drawBall()
    drawPlayers()
    if (!isPaused) {
        frameCount++
        if (frameCount % FRAMES_BETWEEN_PLAYER_PATH_RESETS === 0 || frameCount === 1) setPlayerPaths()
        if (offensiveTeam === players.red) setBallPath()
        movePlayers()
        moveBall()
        // handle goals
    }
    setTimeout(gameLoop, MILLISECONDS_PER_FRAME)
}

function drawGoals() {
    context.beginPath()
    context.rect(goals.red.xPos, goals.red.yPos, GOAL_WIDTH, SCREEN_HEIGHT / 100)
    context.fillStyle = "white"
    context.fill()
    context.beginPath()
    context.rect(goals.blue.xPos, goals.blue.yPos, GOAL_WIDTH, SCREEN_HEIGHT / 100)
    context.fillStyle = "white"
    context.fill()
}

function drawBall() {
    context.beginPath()
    context.arc(ball.xPos, ball.yPos, BALL_RADIUS, 0, 2 * Math.PI)
    context.fillStyle = "white"
    context.fill()
}

function drawPlayers() {
    for (let i = 0; i < players.blue.length; i++) {
        let bluePlayer = players.blue[i]
        context.beginPath()
        context.arc(bluePlayer.xPos, bluePlayer.yPos, PLAYER_RADIUS, 0, 2 * Math.PI)
        context.fillStyle = "Cornflowerblue"
        context.fill()
    }
    for (let i = 0; i < players.red.length; i++) {
        let redPlayer = players.red[i]
        context.beginPath()
        context.arc(redPlayer.xPos, redPlayer.yPos, PLAYER_RADIUS, 0, 2 * Math.PI)
        context.fillStyle = "indianRed"
        context.fill()
    }
}

function setPlayerPaths() {
    let bestOffensiveSpots = getBestOffensiveSpots()
    for (let i = 0; i < bestOffensiveSpots.length; i++) {
        setObjectTowardsSpotAtSpeed(offensiveTeam[i], bestOffensiveSpots[i], SLOW_SPEED)
    }
    let bestDefensiveSpots = getBestDefensiveSpots()
    for (let i = 0; i < bestDefensiveSpots.length; i++) {
        setObjectTowardsSpotAtSpeed(defensiveTeam[i], bestDefensiveSpots[i], SLOW_SPEED)
    }
}

// TODO: there's probably a cheaper way to write this
function getBestOffensiveSpots() {
    let bestOffensiveSpots = []
    for (let xPos = PIXEL_SHIM; xPos < SCREEN_WIDTH; xPos++) {
        for (let yPos = PIXEL_SHIM; yPos < SCREEN_HEIGHT; yPos++) {
            let spot = {
                xPos: xPos,
                yPos: yPos,
            }
            let distanceFromGoal = (offensiveTeam === players.blue ? yPos : canvas.height - yPos)
            if (isObjectDistanceFromObjects(spot, FARNESS_THRESHOLD, players.blue.concat(players.red).concat(bestOffensiveSpots))) {
                for (let i = 0; i < players.blue.length - 1; i++) {
                    if (!bestOffensiveSpots[i] || distanceFromGoal < bestOffensiveSpots[i].yPos) {
                        bestOffensiveSpots[i] = spot
                        break
                    }
                }
            }
        }
    }
    // TODO: I think there's a bug here - why red team so often have only 2 bestOffensiveSpots? And isn't really making runs for each other?
    return bestOffensiveSpots
}

function isObjectDistanceFromObjects(object, distance, objects) {
    for (let i = 0; i < objects.length; i++) {
        if (Math.abs(object.xPos - objects[i].xPos) < distance && Math.abs(object.yPos - objects[i].yPos) < distance) {
            return false
        }
    }
    return true
}

function getBestDefensiveSpots() {
    let bestDefensiveSpots = []
    for (let i = 0; i < defensiveTeam.length - 1; i++) {
        bestDefensiveSpots.push({
            xPos: offensiveTeam[i].xPos,
            yPos: offensiveTeam[i].yPos
        })
    }
    return bestDefensiveSpots
}

function setBallPath() {
    let forwardKickTarget = getForwardKickTarget()
    let backwardKickTarget = getBackwardKickTarget()
    let isSetToDribbleForward = ballPossessor.yPosChangePerFrame > 0
    if (forwardKickTarget) {
        setObjectTowardsSpotAtSpeed(ball, forwardKickTarget, FAST_SPEED)
        isSendingBall = true
        ballPossessor = {}
        hasBeenIntercepted = false
    } else if (isSetToDribbleForward) {
        //do nothing because ballPossessor is already set to dribble forward toward a bestOffensiveSpot
    } else if (backwardKickTarget) {
        // TODO: duplicate code
        setObjectTowardsSpotAtSpeed(ball, backwardKickTarget, FAST_SPEED)
        isSendingBall = true
        ballPossessor = {}
        hasBeenIntercepted = false
    } else {
        //do nothing because ballPossessor is already set to dribble backward toward a bestOffensiveSpot
    }
}

function getForwardKickTarget() {
    let shotTarget = {
        xPos: RED_TEAM_SHOT_TARGETS[Math.floor(Math.random() * 2)],
        yPos: SCREEN_HEIGHT
    }
    if (isPathClear(ballPossessor, shotTarget) && ballPossessor.yPos > SCREEN_HEIGHT / 2) {
        return shotTarget
    }
    return _getKickTargetByDirection("forward")
}

function getBackwardKickTarget() {
    return _getKickTargetByDirection("backward")
}

// TODO: include shots on goal
function _getKickTargetByDirection(direction) { // include shots on goal!
    let kickTarget = null
    for (let i = 0; i < players.red.length; i++) {
        let redPlayer = players.red[i]
        let isInRightDirection = (direction === "forward" && redPlayer.yPos > ballPossessor.yPos) || (direction === "backward" && redPlayer.yPos < ballPossessor.yPos)
        // TODO: rank targets then one-by-one see if path is clear ie should kick
        if (isInRightDirection && isPathClear(ballPossessor, redPlayer)) {
            kickTarget = redPlayer
        }
    }
    return kickTarget
}

function isPathClear(startPoint, endPoint) {
    let pathPoint = {
        xPos: startPoint.xPos,
        yPos: startPoint.yPos,
        xPosChangePerFrame: (endPoint.xPos - startPoint.xPos) * SLOW_SPEED,
        yPosChangePerFrame: (endPoint.yPos - startPoint.yPos) * SLOW_SPEED
    }
    let tries = 0
    while (tries < 100) {
        tries++
        pathPoint.xPos += pathPoint.xPosChangePerFrame
        pathPoint.yPos += pathPoint.yPosChangePerFrame
        if (Math.abs(pathPoint.xPos - endPoint.xPos) < PIXEL_SHIM && Math.abs(pathPoint.yPos - endPoint.yPos) < PIXEL_SHIM) {
            return true
        }
        for (let i = 0; i < players.blue.length; i++) {
            let bluePlayer = players.blue[i]
            if (Math.abs(pathPoint.xPos - bluePlayer.xPos) < PIXEL_SHIM && Math.abs(pathPoint.yPos - bluePlayer.yPos) < PIXEL_SHIM) {
                return false
            }
        }
    }
    return true
}

// TODO: break up
function movePlayers() {
    let teams = [players.blue, players.red]
    for (let i = 0; i < teams.length; i++) {
        let team = teams[i]
        if (sentPlayerFramesLeft > 0) {
            sentPlayer.xPos += sentPlayer.xPosChangePerFrame
            sentPlayer.yPos += sentPlayer.yPosChangePerFrame
            sentPlayerFramesLeft--
        }
        let playerClosestToBall = {
            player: {},
            distanceFromBall: 0
        }
        for (let i = 0; i < team.length; i++) {
            let player = team[i]
            if (isSendingBall) {
                let distanceFromBall = Math.abs(ball.xPos - player.xPos) + Math.abs(ball.yPos - player.yPos)
                if (Object.keys(playerClosestToBall.player).length === 0 || distanceFromBall < playerClosestToBall.distanceFromBall) {
                    playerClosestToBall.player = player
                    playerClosestToBall.distanceFromBall = distanceFromBall
                }
            }
            player.xPos += player.xPosChangePerFrame
            player.yPos += player.yPosChangePerFrame
            bounceObjectIfOut(player)
        }
        let isBlueGoalieMakingSave = playerClosestToBall.player === players.blue[players.blue.length - 1] && SCREEN_HEIGHT - playerClosestToBall.player.yPos < FARNESS_THRESHOLD
        let isRedGoalieMakingSave = playerClosestToBall.player === players.red[players.red.length - 1] && playerClosestToBall.player.yPos < FARNESS_THRESHOLD
        let speed = (isBlueGoalieMakingSave || isRedGoalieMakingSave) ? FAST_SPEED : SLOW_SPEED
        playerClosestToBall.player.xPosChangePerFrame = (ball.xPos - playerClosestToBall.player.xPos) * speed
        playerClosestToBall.player.yPosChangePerFrame = (ball.yPos - playerClosestToBall.player.yPos) * speed
        playerClosestToBall.player.xPos += playerClosestToBall.player.xPosChangePerFrame
        playerClosestToBall.player.yPos += playerClosestToBall.player.yPosChangePerFrame
    }
}

function bounceObjectIfOut(object) {
    if (object.xPos < PIXEL_SHIM) {
        object.xPosChangePerFrame = Math.abs(object.xPosChangePerFrame)
    } else if (object.xPos > SCREEN_WIDTH - PIXEL_SHIM) {
        object.xPosChangePerFrame = -Math.abs(object.xPosChangePerFrame)
    } else if (object.yPos < PIXEL_SHIM) {
        object.yPosChangePerFrame = Math.abs(object.yPosChangePerFrame)
    } else if (object.yPos > SCREEN_HEIGHT - PIXEL_SHIM) {
        object.yPosChangePerFrame = -Math.abs(object.yPosChangePerFrame)
    }
}

// TODO: WIP unused
function switchPossessionIfTackled(player) {
    for (let i = 0; i < players.blue.concat(players.red).length; i++) {
        let interceptingPlayer = players.blue.concat(players.red)[i]
        let isHorizontallyAlignedWithPlayer = (player.xPos > interceptingPlayer.xPos - PLAYER_RADIUS) && (player.xPos < interceptingPlayer.xPos + PLAYER_RADIUS)
        let isVerticallyAlignedWithPlayer = (player.yPos > interceptingPlayer.yPos - PLAYER_RADIUS) && (player.yPos < interceptingPlayer.yPos + PLAYER_RADIUS)
        if (player !== interceptingPlayer && isHorizontallyAlignedWithPlayer && isVerticallyAlignedWithPlayer) {
            ballPossessor = interceptingPlayer
            setOffensiveAndDefensiveTeams()
        }
    }
}

function moveBall() {
    if (Object.keys(ballPossessor).length > 0) {
        ball.xPosChangePerFrame = ballPossessor.xPosChangePerFrame
        ball.yPosChangePerFrame = ballPossessor.yPosChangePerFrame
    }
    ball.xPos += ball.xPosChangePerFrame
    ball.yPos += ball.yPosChangePerFrame
    bounceObjectIfOut(ball)
    stopBallIfIntercepted()
}

function stopBallIfIntercepted() {
    for (let i = 0; i < players.blue.concat(players.red).length; i++) {
        let player = players.blue.concat(players.red)[i]
        let isFarFromTouch1 = (Math.abs(player.xPos - touch1.xPos) > PLAYER_RADIUS) || (Math.abs(player.yPos - touch1.yPos) > PLAYER_RADIUS)
        let isHorizontallyAlignedWithPlayer = (ball.xPos > player.xPos - PLAYER_RADIUS) && (ball.xPos < player.xPos + PLAYER_RADIUS)
        let isVerticallyAlignedWithPlayer = (ball.yPos > player.yPos - PLAYER_RADIUS) && (ball.yPos < player.yPos + PLAYER_RADIUS)
        if (!hasBeenIntercepted && isFarFromTouch1 && isHorizontallyAlignedWithPlayer && isVerticallyAlignedWithPlayer) {
            isSendingBall = false
            hasBeenIntercepted = true
            ball.xPosChangePerFrame = 0
            ball.yPosChangePerFrame = 0
            ballPossessor = player
            ballPossessor.xPosChangePerFrame = 0
            ballPossessor.yPosChangePerFrame = 0
            setPlayerPaths()
            setOffensiveAndDefensiveTeams()
        }
    }
}

function setOffensiveAndDefensiveTeams() {
    for (let i = 0; i < players.blue.length; i++) {
        if (ballPossessor === players.blue[i]) {
            offensiveTeam = players.blue
            defensiveTeam = players.red
            return
        }
    }
    for (let i = 0; i < players.red.length; i++) {
        if (ballPossessor === players.red[i]) {
            offensiveTeam = players.red
            defensiveTeam = players.blue
            return
        }
    }
}

/* TODO:
collisions (combine into one function, make so players can't intersect, handleGoals)
better player-sends and player-dribbles (think: better destinations, longer, staggered-in-randomized order, deceleration, drag-to-dribble)
change player skill levels via difficulty slider and via blue player emotions (cute leeetle emoticons in their big round faces)
menu and scoreboard (if a team goal total % 3 == 0: ask user if want to restart or continue)
*/

const MILLISECONDS_PER_FRAME = 16
const PLAYER_RADIUS =  25
const BALL_RADIUS = PLAYER_RADIUS / 2
const GOAL_WIDTH = PLAYER_RADIUS * 6
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 3
const SLOW_SPEED = 0.005
const FAST_SPEED = 0.05
const FARNESS_THRESHOLD = PLAYER_RADIUS * 5
const FRAMES_BETWEEN_PLAYER_PATH_RESETS = 100
const RED_TEAM_SHOT_TARGETS = [(visualViewport.width / 2) + (GOAL_WIDTH / 3), (visualViewport.width / 2) - (GOAL_WIDTH / 3)]
const BLUE_GOALIE_SPOT = {
    xPos: visualViewport.width / 2,
    yPos: visualViewport.height - PIXEL_SHIM
}
const RED_GOALIE_SPOT = {
    xPos: visualViewport.width / 2,
    yPos: PIXEL_SHIM
}
const DIRECTIONS = {
    FORWARD: "forward",
    BACKWARD: "backward"
}

let canvas;
let context;
let players = {
    blue: [
        {
            xPos: visualViewport.width / 2,
            yPos: (visualViewport.height / 2) + PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: visualViewport.width / 5,
            yPos: visualViewport.height * 0.75,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: visualViewport.width * 0.8,
            yPos: visualViewport.height * 0.75,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: BLUE_GOALIE_SPOT.xPos,
            yPos: BLUE_GOALIE_SPOT.yPos,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        }

    ],
    red: [
        {
            xPos: visualViewport.width /2,
            yPos: (visualViewport.height / 2) - (PIXEL_SHIM * 3),
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: visualViewport.width / 5,
            yPos: visualViewport.height / 4,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: visualViewport.width * 0.8,
            yPos: visualViewport.height / 4,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: RED_GOALIE_SPOT.xPos,
            yPos: RED_GOALIE_SPOT.yPos,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
    ]
}
let blueGoalie = players.blue[players.blue.length - 1]
let redGoalie = players.red[players.red.length - 1]
let ball = {
    radius: BALL_RADIUS,
    xPos: visualViewport.width / 2,
    yPos: visualViewport.height / 2,
    xPosChangePerFrame: 0,
    yPosChangePerFrame: 0
}
let goals = {
    red: {
        xPos: (visualViewport.width - (PLAYER_RADIUS * 6)) / 2,
        yPos: 0
    },
    blue: {
        xPos: (visualViewport.width - (PLAYER_RADIUS * 6)) / 2,
        yPos: visualViewport.height - PIXEL_SHIM
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
let ballPossessor = {}
let frameCount = 0
let isPaused = true
let sentPlayer = {}
let sentPlayerFramesLeft = 0

function initializeGame() {
    canvas = document.getElementById("canvas")
    canvas.width = visualViewport.width
    canvas.height = visualViewport.height
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
    for (let i = 0; i < players.blue.length; i++) {
        let bluePlayer = players.blue[i]
        let isTouchHorizontallyAlignedWithPlayer = (touch1.xPos > bluePlayer.xPos - PLAYER_RADIUS) && (touch1.xPos < bluePlayer.xPos + PLAYER_RADIUS)
        let isTouchVerticallyAlignedWithPlayer = (touch1.yPos > bluePlayer.yPos - PLAYER_RADIUS) && (touch1.yPos < bluePlayer.yPos + PLAYER_RADIUS)
        if (isTouchHorizontallyAlignedWithPlayer && isTouchVerticallyAlignedWithPlayer) {
            let isPlayerHorizontallyAlignedWithBall = Math.abs(bluePlayer.xPos - ball.xPos) <= PIXEL_SHIM
            let isPlayerVerticallyAlignedWithBall = Math.abs(bluePlayer.yPos - ball.yPos) <= PIXEL_SHIM
            if (isPlayerHorizontallyAlignedWithBall && isPlayerVerticallyAlignedWithBall) {
                ballPossessor = {}
            }
            else {
                sentPlayer = bluePlayer
            }
        }
    }
}

function handleTouchmove(event) {
    event.preventDefault()
    touch2.xPos = event.touches[0].clientX
    touch2.yPos = event.touches[0].clientY
    if (Object.keys(ballPossessor).length === 0) {
        setObjectTowardsSpotAtSpeed(ball, touch2, FAST_SPEED)
        isPaused = false
    } else if (Object.keys(sentPlayer).length > 0) {
        setObjectTowardsSpotAtSpeed(sentPlayer, touch2, FAST_SPEED)
        sentPlayerFramesLeft = FRAMES_PER_SENT_PLAYER
    }
}

function setObjectTowardsSpotAtSpeed(object, spot, speed) {
    object.xPosChangePerFrame = (spot.xPos - object.xPos) * speed
    object.yPosChangePerFrame = (spot.yPos - object.yPos) * speed
}

function gameLoop() {
    if (!isPaused) {
        if (frameCount % FRAMES_BETWEEN_PLAYER_PATH_RESETS === 0 || frameCount === 0) setPlayerPaths()
        movePlayers()
        if (offensiveTeam === players.red) setBallPath()
        moveBall()
        frameCount++
    }
    context.clearRect(0, 0, canvas.width, canvas.height)
    drawGoals()
    drawBall()
    drawPlayers()
    setTimeout(gameLoop, MILLISECONDS_PER_FRAME)
}

function setPlayerPaths() {
    let bestOffensiveSpots = getBestOffensiveSpots()
    for (let i = 0; i < bestOffensiveSpots.length; i++) {
        if (offensiveTeam[i] !== sentPlayer) setObjectTowardsSpotAtSpeed(offensiveTeam[i], bestOffensiveSpots[i], SLOW_SPEED)
    }
    let bestDefensiveSpots = getBestDefensiveSpots()
    for (let i = 0; i < bestDefensiveSpots.length; i++) {
        if (defensiveTeam[i] !== sentPlayer) setObjectTowardsSpotAtSpeed(defensiveTeam[i], bestDefensiveSpots[i], SLOW_SPEED)
    }
    setObjectTowardsSpotAtSpeed(blueGoalie, BLUE_GOALIE_SPOT, SLOW_SPEED)
    setObjectTowardsSpotAtSpeed(redGoalie, RED_GOALIE_SPOT, SLOW_SPEED)
}

function getBestOffensiveSpots() {
    let bestOffensiveSpots = []
    for (let xPos = PIXEL_SHIM; xPos < visualViewport.width; xPos++) {
        for (let yPos = PIXEL_SHIM; yPos < visualViewport.height; yPos++) {
            let spot = {
                xPos: xPos,
                yPos: yPos,
            }
            let distanceFromGoal = (offensiveTeam === players.blue ? yPos : canvas.height - yPos)
            if (isObjectFarFromObjects(spot, FARNESS_THRESHOLD, players.blue.concat(players.red).concat(bestOffensiveSpots))) {
                for (let i = 0; i < offensiveTeam.length - 1; i++) {
                    if (!bestOffensiveSpots[i] || distanceFromGoal < bestOffensiveSpots[i].yPos) {
                        bestOffensiveSpots[i] = spot
                        break
                    }
                }
            }
        }
    }
    return bestOffensiveSpots
}

function isObjectFarFromObjects(object, distance, objects) {
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
            if (Object.keys(ballPossessor).length === 0) {
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
        let isBlueGoalieMakingSave = playerClosestToBall.player === players.blue[players.blue.length - 1] && visualViewport.height - playerClosestToBall.player.yPos < FARNESS_THRESHOLD
        let isRedGoalieMakingSave = playerClosestToBall.player === players.red[players.red.length - 1] && playerClosestToBall.player.yPos < FARNESS_THRESHOLD
        let speed = (isBlueGoalieMakingSave || isRedGoalieMakingSave) ? FAST_SPEED : SLOW_SPEED
        playerClosestToBall.player.xPosChangePerFrame = (ball.xPos - playerClosestToBall.player.xPos) * speed
        playerClosestToBall.player.yPosChangePerFrame = (ball.yPos - playerClosestToBall.player.yPos) * speed
        playerClosestToBall.player.xPos += playerClosestToBall.player.xPosChangePerFrame
        playerClosestToBall.player.yPos += playerClosestToBall.player.yPosChangePerFrame
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

function bounceObjectIfOut(object) {
    if (object.xPos < PIXEL_SHIM) {
        object.xPosChangePerFrame = Math.abs(object.xPosChangePerFrame)
    } else if (object.xPos > visualViewport.width - PIXEL_SHIM) {
        object.xPosChangePerFrame = -Math.abs(object.xPosChangePerFrame)
    } else if (object.yPos < PIXEL_SHIM) {
        object.yPosChangePerFrame = Math.abs(object.yPosChangePerFrame)
    } else if (object.yPos > visualViewport.height - PIXEL_SHIM) {
        object.yPosChangePerFrame = -Math.abs(object.yPosChangePerFrame)
    }
}

function setBallPath() {
    let forwardKickTarget = getKickTargetByDirection(DIRECTIONS.FORWARD)
    let backwardKickTarget = getKickTargetByDirection(DIRECTIONS.BACKWARD)
    let isSetToDribbleForward = ballPossessor.yPosChangePerFrame > 0
    if (forwardKickTarget) {
        ballPossessor = {}
        setObjectTowardsSpotAtSpeed(ball, forwardKickTarget, FAST_SPEED)
    } else if (isSetToDribbleForward) {
        //do nothing because ballPossessor is already set to dribble forward toward a bestOffensiveSpot
    } else if (backwardKickTarget) {
        ballPossessor = {}
        setObjectTowardsSpotAtSpeed(ball, backwardKickTarget, FAST_SPEED)
    } else {
        //do nothing because ballPossessor is already set to dribble backward toward a bestOffensiveSpot
    }
}

function getKickTargetByDirection(direction) {
    if (direction === DIRECTIONS.FORWARD) {
        let shotTarget = {
            xPos: RED_TEAM_SHOT_TARGETS[Math.floor(Math.random() * RED_TEAM_SHOT_TARGETS.length)],
            yPos: visualViewport.height
        }
        if (isPathClear(ballPossessor, shotTarget) && ballPossessor.yPos > visualViewport.height / 2) {
            return shotTarget
        }
    }
    let kickTarget = null
    for (let i = 0; i < players.red.length; i++) {
        let redPlayer = players.red[i]
        let isInRightDirection = (direction === "forward" && redPlayer.yPos > ballPossessor.yPos) || (direction === "backward" && redPlayer.yPos < ballPossessor.yPos)
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
        if (Object.keys(ballPossessor).length === 0 && isFarFromTouch1 && isHorizontallyAlignedWithPlayer && isVerticallyAlignedWithPlayer) {
            ballPossessor = player
            setOffensiveAndDefensiveTeams()
            setPlayerPaths()
        }
    }
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

function drawBall() {
    context.beginPath()
    context.arc(ball.xPos, ball.yPos, BALL_RADIUS, 0, 2 * Math.PI)
    context.fillStyle = "white"
    context.fill()
}

function drawGoals() {
    context.beginPath()
    context.rect(goals.red.xPos, goals.red.yPos, GOAL_WIDTH, visualViewport.height / 100)
    context.fillStyle = "white"
    context.fill()
    context.beginPath()
    context.rect(goals.blue.xPos, goals.blue.yPos, GOAL_WIDTH, visualViewport.height / 100)
    context.fillStyle = "white"
    context.fill()
}

/* TODO:
collisions (combine into one function, make so players can't intersect, handleGoals)
better player-sends and player-dribbles (think: better destinations, longer, staggered-in-randomized order, deceleration, drag-to-dribble)
change player skill levels via difficulty slider and via blue player emotions (cute leeetle emoticons in their big round faces)
menu and scoreboard (if a team goal total % 3 == 0: ask user if want to restart or continue)
polish and release
*/

const MILLISECONDS_PER_FRAME = 16
const PLAYER_RADIUS =  25
const BALL_RADIUS = PLAYER_RADIUS / 2
const GOAL_WIDTH = PLAYER_RADIUS * 6
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 3
const SLOW_SPEED = 0.005
const FAST_SPEED = 0.05
const FARNESS_THRESHOLD = PLAYER_RADIUS * 6
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
let isSendingPlayer = false
let isSendingBall = false
let hasBeenIntercepted = false

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
        isPaused = false
        ballPossessor = {}
        hasBeenIntercepted = false
        setObjectTowardsSpotAtSpeed(ball, touch2, FAST_SPEED)
    } else if (isSendingPlayer) {
        sentPlayerFramesLeft = FRAMES_PER_SENT_PLAYER
        setObjectTowardsSpotAtSpeed(sentPlayer, touch2, FAST_SPEED)
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
        if (frameCount % FRAMES_BETWEEN_PLAYER_PATH_RESETS === 0 || frameCount === 0) setPlayerPaths()
        if (offensiveTeam === players.red) setBallPath()
        handlePlayerCollision()
        // if (ballGoalCollision in collisions) handleBallGoalCollision()
        movePlayers()
        moveBall()
        frameCount++
    }
    setTimeout(gameLoop, MILLISECONDS_PER_FRAME)
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
        if (offensiveTeam[i] !== sentPlayer) setObjectTowardsSpotAtSpeed(offensiveTeam[i], bestOffensiveSpots[i], SLOW_SPEED)
    }
    let bestDefensiveSpots = getBestDefensiveSpots()
    for (let i = 0; i < bestDefensiveSpots.length; i++) {
        if (defensiveTeam[i] !== sentPlayer) setObjectTowardsSpotAtSpeed(defensiveTeam[i], bestDefensiveSpots[i], SLOW_SPEED)
    }
    setObjectTowardsSpotAtSpeed(players.blue[players.blue.length - 1], BLUE_GOALIE_SPOT, SLOW_SPEED)
    setObjectTowardsSpotAtSpeed(players.red[players.red.length - 1], RED_GOALIE_SPOT, SLOW_SPEED)
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
            if (isObjectDistanceFromObjects(spot, FARNESS_THRESHOLD, players.blue.concat(players.red).concat(bestOffensiveSpots))) {
                for (let i = 0; i < offensiveTeam.length - 1; i++) {
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
        isSendingBall = true
        ballPossessor = {}
        hasBeenIntercepted = false
        setObjectTowardsSpotAtSpeed(ball, forwardKickTarget, FAST_SPEED)
    } else if (isSetToDribbleForward) {
        //do nothing because ballPossessor is already set to dribble forward toward a bestOffensiveSpot
    } else if (backwardKickTarget) {
        // TODO: duplicate code
        isSendingBall = true
        ballPossessor = {}
        hasBeenIntercepted = false
        setObjectTowardsSpotAtSpeed(ball, backwardKickTarget, FAST_SPEED)
    } else {
        //do nothing because ballPossessor is already set to dribble backward toward a bestOffensiveSpot
    }
}

function getForwardKickTarget() {
    let shotTarget = {
        xPos: RED_TEAM_SHOT_TARGETS[Math.floor(Math.random() * RED_TEAM_SHOT_TARGETS.length)],
        yPos: visualViewport.height
    }
    if (isPathClear(ballPossessor, shotTarget) && ballPossessor.yPos > visualViewport.height / 2) {
        return shotTarget
    }
    return _getKickTargetByDirection("forward")
}

function getBackwardKickTarget() {
    return _getKickTargetByDirection("backward")
}

function _getKickTargetByDirection(direction) {
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

function handlePlayerCollision() {
    // for (let i = 0; i < players.blue.length; i++) {
    //     let bluePlayer = players.blue[i]
    //     for (let ii = 0; ii < players.red.length; ii++) {
    //         let redPlayer = players.red[i]
    //         if ((bluePlayer === ballPossessor || redPlayer === ballPossessor) && bluePlayer.xPos - redPlayer.xPos < PLAYER_RADIUS*6 && bluePlayer.yPos - redPlayer.yPos < PLAYER_RADIUS*6) {
    //             redPlayer.xPosChangePerFrame = 0
    //             redPlayer.yPosChangePerFrame = 0
    //             if ((Math.abs(bluePlayer.xPos - ball.xPos) + Math.abs(bluePlayer.yPos - ball.yPos)) < (Math.abs(redPlayer.xPos - ball.xPos) + Math.abs(redPlayer.yPos - ball.yPos))) {
    //                 ballPossessor = bluePlayer
    //             } else {
    //                 ballPossessor = redPlayer
    //             }
    //             setOffensiveAndDefensiveTeams()
    //         }
    //     }
    // }
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
            if (isSendingBall) {
                let distanceFromBall = Math.abs(ball.xPos - player.xPos) + Math.abs(ball.yPos - player.yPos)
                if (Object.keys(playerClosestToBall.player).length === 0 || distanceFromBall < playerClosestToBall.distanceFromBall) {
                    playerClosestToBall.player = player
                    playerClosestToBall.distanceFromBall = distanceFromBall
                }
            }
            switchPossessionIfTackled(player)
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

function switchPossessionIfTackled(player) {
    // for (let i = 0; i < players.blue.concat(players.red).length; i++) {
    //     let interceptingPlayer = players.blue.concat(players.red)[i]
    //     let isHorizontallyAlignedWithPlayer = (player.xPos > interceptingPlayer.xPos - PLAYER_RADIUS) && (player.xPos < interceptingPlayer.xPos + PLAYER_RADIUS)
    //     let isVerticallyAlignedWithPlayer = (player.yPos > interceptingPlayer.yPos - PLAYER_RADIUS) && (player.yPos < interceptingPlayer.yPos + PLAYER_RADIUS)
    //     let isFartherFromBall = ((Math.abs(interceptingPlayer.xPos - ball.xPos) + Math.abs(interceptingPlayer.yPos - ball.yPos)) < (Math.abs(player.xPos - ball.xPos) + Math.abs(player.yPos - ball.yPos)))
    //     if (player === ballPossessor && player !== interceptingPlayer && isHorizontallyAlignedWithPlayer && isVerticallyAlignedWithPlayer && !isFartherFromBall) {
    //         ballPossessor = interceptingPlayer
    //         player.xPosChangePerFrame = -player.xPosChangePerFrame
    //         player.yPosChangePerFrame = -player.yPosChangePerFrame
    //         setOffensiveAndDefensiveTeams()
    //         ball.xPos = interceptingPlayer.xPos
    //         if (interceptingPlayer in players.blue) {
    //             ball.yPos = interceptingPlayer.yPos - PLAYER_RADIUS
    //         } else {
    //             ball.yPos = interceptingPlayer.yPos + PLAYER_RADIUS
    //         }
    //     }
    // }
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

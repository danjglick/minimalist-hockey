/* TODO:
polish collision checker/handler
better player-sends and player-dribbles (think: better destinations, longer, staggered-in-randomized order, deceleration, drag-to-dribble)
scoreboard and menu
change player skill levels via difficulty slider and via blue player emotions (cute leeetle emoticons in their big round faces)
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
    forward: "forward",
    backward: "backward"
}
const GOALS = {
    red: {
        xPos: (visualViewport.width - (PLAYER_RADIUS * 6)) / 2,
        yPos: 0
    },
    blue: {
        xPos: (visualViewport.width - (PLAYER_RADIUS * 6)) / 2,
        yPos: visualViewport.height - PIXEL_SHIM
    }
}
const WALLS = {
    left: "left",
    right: "right",
    top: "top",
    bottom: "bottom"
}

const PLAYER_STARTING_POSITIONS = {
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
            xPos: visualViewport.width / 2,
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
let ballPossessor = players.blue[0]
let isSendingBall = false
let frameCount = 0
let isPaused = true
let sentPlayer = {}
let sentPlayerFramesLeft = 0
let score = {
    blue: 0,
    red: 0
}

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
                isSendingBall = true
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
    if (isSendingBall) {
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
        frameCount++
        if (frameCount % FRAMES_BETWEEN_PLAYER_PATH_RESETS === 0 || frameCount === 1) setPlayerPaths()
        if (offensiveTeam === players.red && !isSendingBall) setBallPath()
        movePlayers()
        moveBall()
        let collisions = getCollisions()
        for (let i = 0; i < collisions.playerPlayer.length; i++) { handlePlayerPlayerCollision(collisions.playerPlayer[i].playerA, collisions.playerPlayer[i].playerB) }
        for (let i = 0; i < collisions.playerBall.length; i++) { handlePlayerBallCollision(collisions.playerBall[i].player, collisions.playerBall[i].ball) }
        for (let i = 0; i < collisions.objectWall.length; i++) { handleObjectWallCollision(collisions.objectWall[i].object, collisions.objectWall[i].wall) }
        for (let i = 0; i < collisions.ballGoal.length; i++) { handleBallGoalCollision(collisions.ballGoal[i].ball, collisions.ballGoal[i].goal) }
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

function setBallPath() {
    let forwardKickTarget = getKickTargetByDirection(DIRECTIONS.forward)
    let backwardKickTarget = getKickTargetByDirection(DIRECTIONS.backward)
    let isSetToDribbleForward = ballPossessor.yPosChangePerFrame > 0
    if (forwardKickTarget) {
        setObjectTowardsSpotAtSpeed(ball, forwardKickTarget, FAST_SPEED)
        isSendingBall = true
    } else if (isSetToDribbleForward) {
        //do nothing because ballPossessor is already set to dribble forward toward a bestOffensiveSpot
    } else if (backwardKickTarget) {
        setObjectTowardsSpotAtSpeed(ball, backwardKickTarget, FAST_SPEED)
        isSendingBall = true
    } else {
        //do nothing because ballPossessor is already set to dribble backward toward a bestOffensiveSpot
    }
}

function getKickTargetByDirection(direction) {
    if (direction === DIRECTIONS.forward) {
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
        }
        let isBlueGoalieMakingSave = playerClosestToBall.player === blueGoalie && visualViewport.height - playerClosestToBall.player.yPos < FARNESS_THRESHOLD
        let isRedGoalieMakingSave = playerClosestToBall.player === redGoalie && playerClosestToBall.player.yPos < FARNESS_THRESHOLD
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

function moveBall() {
    if (!isSendingBall) {
        ball.xPosChangePerFrame = ballPossessor.xPosChangePerFrame
        ball.yPosChangePerFrame = ballPossessor.yPosChangePerFrame
    }
    ball.xPos += ball.xPosChangePerFrame
    ball.yPos += ball.yPosChangePerFrame
}

function getCollisions() {
    let collisions = {
        playerPlayer: [],
        playerBall: [],
        objectWall: [],
        ballGoal: []
    }
    let playersList = players.blue.concat(players.red)
    for (let i = 0; i < playersList.length; i++) {
        let player = playersList[i]
        for (let ii = 0; ii < playersList.length; ii++) {
            let playerB = playersList[ii]
            if (player !== playerB && isObjectCloseToObject(player, PLAYER_RADIUS * 2, playerB)) {
                collisions.playerPlayer.push({
                    playerA: player,
                    playerB: playerB
                })
            }
        }
        if (player !== ballPossessor && isObjectCloseToObject(player, PLAYER_RADIUS, ball)) {
            collisions.playerBall = [{
                player: player,
                ball: ball
            }]
        }
        let wall = getWallCollidedIntoByObject(player)
        if (wall) {
            collisions.objectWall.push({
                object: player,
                wall: wall
            })
        }
        wall = getWallCollidedIntoByObject(ball)
        if (wall) {
            collisions.objectWall.push({
                object: ball,
                wall: wall
            })
        }
        if (ball.xPos >= GOALS.blue.xPos && ball.xPos <= GOALS.blue.xPos + GOAL_WIDTH) {
            if (ball.yPos >= GOALS.blue.yPos) {
                collisions.ballGoal = [{
                    ball: ball,
                    goal: GOALS.blue
                }]
            } else if (ball.yPos <= GOALS.red.yPos) {
                collisions.ballGoal = [{
                    ball: ball,
                    goal: GOALS.red
                }]
            }
        }
    }
    return collisions
}

function isObjectCloseToObject(objectA, distance, objectB) {
    return Math.abs(objectA.xPos - objectB.xPos) < distance && Math.abs(objectA.yPos - objectB.yPos) < distance
}

function getWallCollidedIntoByObject(object) {
    if (object.xPos < PIXEL_SHIM) {
        return WALLS.left
    } else if (object.xPos > visualViewport.width - PIXEL_SHIM) {
        return WALLS.right
    } else if (object.yPos < PIXEL_SHIM) {
        return WALLS.top
    } else if (object.yPos > visualViewport.height - PIXEL_SHIM) {
        return WALLS.bottom
    }
}

function handlePlayerPlayerCollision(playerA, playerB) {
    playerA.xPos += playerB.xPosChangePerFrame
    playerA.yPos += playerB.yPosChangePerFrame
    playerB.xPos += playerA.xPosChangePerFrame
    playerB.yPos += playerA.yPosChangePerFrame
}

function handlePlayerBallCollision(player, ball) {
    if ((player in defensiveTeam || isSendingBall) && ballPossessor !== player) {
        ballPossessor = player
        isSendingBall = false
        setOffensiveAndDefensiveTeams()
        setPlayerPaths()
    }
}

function handleObjectWallCollision(object, wall) {
    if (wall === WALLS.left) {
        object.xPosChangePerFrame = Math.abs(object.xPosChangePerFrame)
    } else if (wall === WALLS.right) {
        object.xPosChangePerFrame = -Math.abs(object.xPosChangePerFrame)
    } else if (wall === WALLS.top) {
        object.yPosChangePerFrame = Math.abs(object.yPosChangePerFrame)
    } else if (wall === WALLS.bottom) {
        object.yPosChangePerFrame = -Math.abs(object.yPosChangePerFrame)
    }
}

function handleBallGoalCollision(ball, goal) {
    ball.xPos = visualViewport.width / 2
    ball.yPos = visualViewport.height / 2
    ball.xPosChangePerFrame = 0
    ball.yPosChangePerFrame = 0
    players = {
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
                xPos: visualViewport.width / 2,
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
    if (goal === GOALS.blue) {
        score.red++
        isPaused = true
    } else {
        score.blue++
        players.blue[0].yPos = visualViewport.height / 2 + PIXEL_SHIM * 3
        players.red[0].yPos = visualViewport.height / 2 - PIXEL_SHIM
    }
    alert(`Blue ${score.blue} - Red ${score.red}`)
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
    context.rect(GOALS.red.xPos, GOALS.red.yPos, GOAL_WIDTH, visualViewport.height / 100)
    context.fillStyle = "white"
    context.fill()
    context.beginPath()
    context.rect(GOALS.blue.xPos, GOALS.blue.yPos, GOAL_WIDTH, visualViewport.height / 100)
    context.fillStyle = "white"
    context.fill()
}

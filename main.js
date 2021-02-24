// red-team offense
// tackles, stop player if intercepted
// goalies
// tap in open space to move player
// dead bounce bug, off by one border bug
// count goals
// menu
// difficulty bar
// polish
// release

const MILLISECONDS_PER_FRAME = 16
const PLAYER_RADIUS = 25
const BALL_RADIUS = 12.5
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 3
const SLOW_SPEED = 0.005
const FAST_SPEED = 0.05
const DECELERATION = 0.75
const FARNESS_THRESHOLD = PLAYER_RADIUS * 5
const FRAMES_BETWEEN_PLAYER_PATH_RESETS = 100

let canvas;
let context;
let screenWidth = visualViewport.width
let screenHeight = visualViewport.height
let players = {
    blue: [
        {
            xPos: screenWidth * 0.5,
            yPos: screenHeight * 0.5 + PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: screenWidth * 0.2,
            yPos: screenHeight * 0.75,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: screenWidth * 0.8,
            yPos: screenHeight * 0.75,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: screenWidth * 0.5,
            yPos: screenHeight - PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        }

    ],
    red: [
        {
            xPos: screenWidth * 0.5,
            yPos: (screenHeight * 0.5) - (PIXEL_SHIM * 3),
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: screenWidth * 0.2,
            yPos: screenHeight * 0.25,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: screenWidth * 0.8,
            yPos: screenHeight * 0.25,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
        {
            xPos: screenWidth * 0.5,
            yPos: PIXEL_SHIM,
            xPosChangePerFrame: 0,
            yPosChangePerFrame: 0
        },
    ]
}
let ball = {
    radius: BALL_RADIUS,
    xPos: screenWidth * 0.5,
    yPos: screenHeight * 0.5,
    xPosChangePerFrame: 0,
    yPosChangePerFrame: 0
}
let goals = {
    red: {
        xPos: screenWidth * 0.25,
        yPos: 0
    },
    blue: {
        xPos: screenWidth * 0.25,
        yPos: screenHeight - PIXEL_SHIM
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
    canvas.width = screenWidth
    canvas.height = screenHeight
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
        frameCount += 1
        if (frameCount % FRAMES_BETWEEN_PLAYER_PATH_RESETS === 0 || frameCount === 1) setPlayerPaths()
        // if (offensiveTeam == players.red) setBallPath() //probably will require refactoring setBallTowardsTouch2() to take arg instead of relying on touch2
        movePlayers()
        moveBall()
        // handle goals
    }
    setTimeout(gameLoop, MILLISECONDS_PER_FRAME)
}

function drawGoals() {
    context.beginPath()
    context.rect(goals.red.xPos, goals.red.yPos, screenWidth / 2, screenHeight / 100)
    context.fillStyle = "white"
    context.fill()
    context.beginPath()
    context.rect(goals.blue.xPos, goals.blue.yPos, screenWidth / 2, screenHeight / 100)
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
        setObjectTowardsSpotAtSpeed(defensiveTeam[i], bestDefensiveSpots[i], SLOW_SPEED)
    }
}

function getBestOffensiveSpots() {
    let bestOffensiveSpots = []
    for (let xPos = PIXEL_SHIM; xPos < screenWidth; xPos++) {
        for (let yPos = PIXEL_SHIM; yPos < screenHeight; yPos++) {
            let spot = {
                xPos: xPos,
                yPos: yPos,
            }
            let distanceFromGoal = (offensiveTeam === players.blue ? yPos : -yPos)
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

// function setBallPath() {
//      if (open pass ahead) pass
//      else if (open space ahead) dribble
//      else if (open goal ahead) shoot
//      else if (open pass behind) pass
//      else dribble
// }

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
        playerClosestToBall.player.xPosChangePerFrame = (ball.xPos - playerClosestToBall.player.xPos) * SLOW_SPEED
        playerClosestToBall.player.yPosChangePerFrame = (ball.yPos - playerClosestToBall.player.yPos) * SLOW_SPEED
        playerClosestToBall.player.xPos += playerClosestToBall.player.xPosChangePerFrame
        playerClosestToBall.player.yPos += playerClosestToBall.player.yPosChangePerFrame
    }
}

function bounceObjectIfOut(object) {
    if (object.xPos <= 0 || object.xPos >= screenWidth) {
        object.xPosChangePerFrame = -object.xPosChangePerFrame * DECELERATION
    } else if (object.yPos <= 0 || object.yPos >= screenHeight) {
        object.yPosChangePerFrame = -object.yPosChangePerFrame * DECELERATION
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

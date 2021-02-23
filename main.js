// go to loose ball
// goalies
// bounce collisions
// fix red team getting stuck bug
// red-team send-ball
// fix stealing

const MILLISECONDS_PER_FRAME = 16
const BALL_RADIUS = 12.5
const PLAYER_RADIUS = 25
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 3
const SLOW_MULTIPLIER = 0.005
const FAST_MULTIPLIER = 0.05
const FARNESS_THRESHOLD = PLAYER_RADIUS * 5
const FRAMES_BETWEEN_PLAYER_PATH_RESETS = 100

let canvas;
let context;
let screenWidth = visualViewport.width
let screenHeight = visualViewport.height
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
let ball = {
    radius: BALL_RADIUS,
    xPos: screenWidth * 0.5,
    yPos: screenHeight * 0.5,
    xPosChangePerFrame: 0,
    yPosChangePerFrame: 0
}

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
    let xPosChangePerFrame = (touch2.xPos - touch1.xPos) * FAST_MULTIPLIER
    let yPosChangePerFrame = (touch2.yPos - touch1.yPos) * FAST_MULTIPLIER
    if (isSendingBall) {
        ball.xPosChangePerFrame = xPosChangePerFrame
        ball.yPosChangePerFrame = yPosChangePerFrame
        ballPossessor = {}
        hasBeenIntercepted = false
        isPaused = false
    } else if (isSendingPlayer) {
        sentPlayer.xPosChangePerFrame = xPosChangePerFrame
        sentPlayer.yPosChangePerFrame = yPosChangePerFrame
        sentPlayerFramesLeft = FRAMES_PER_SENT_PLAYER
    }
}

function gameLoop() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    drawGoals()
    drawBall()
    drawPlayers()
    if (!isPaused) {
        frameCount += 1
        if (frameCount % FRAMES_BETWEEN_PLAYER_PATH_RESETS === 0 || frameCount === 1) {
            resetPlayerPaths()
        }
        movePlayers()
        moveBall()
        stopBallIfIntercepted()
    }
    setTimeout(gameLoop, MILLISECONDS_PER_FRAME)
}

function resetPlayerPaths() {
    setTeamTowardsSpots(offensiveTeam, getBestOffensiveSpots())
    setTeamTowardsSpots(defensiveTeam, getBestDefensiveSpots())
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

function getPlayerClosestToBallByTeam(team) {

}

function movePlayers() {
    if (sentPlayerFramesLeft > 0) {
        sentPlayer.xPos += sentPlayer.xPosChangePerFrame
        sentPlayer.yPos += sentPlayer.yPosChangePerFrame
        sentPlayerFramesLeft--
    }
    let bluePlayerClosestToBall = {
        player: {},
        distanceFromBall: 0
    }
    for (let i = 0; i < players.blue.length; i++) {
        let bluePlayer = players.blue[i]
        if (isSendingBall) {
            let distanceFromBall = Math.abs(ball.xPos - bluePlayer.xPos) + Math.abs(ball.yPos - bluePlayer.yPos)
            if (Object.keys(bluePlayerClosestToBall.player).length === 0 || distanceFromBall < bluePlayerClosestToBall.distanceFromBall) {
                bluePlayerClosestToBall.player = bluePlayer
                bluePlayerClosestToBall.distanceFromBall = distanceFromBall
            }
        }
        bluePlayer.xPos += bluePlayer.xPosChangePerFrame
        bluePlayer.yPos += bluePlayer.yPosChangePerFrame
        stopObjectIfOut(bluePlayer)
    }
    bluePlayerClosestToBall.player.xPosChangePerFrame = (ball.xPos - bluePlayerClosestToBall.player.xPos) * SLOW_MULTIPLIER
    bluePlayerClosestToBall.player.yPosChangePerFrame = (ball.yPos - bluePlayerClosestToBall.player.yPos) * SLOW_MULTIPLIER
    bluePlayerClosestToBall.player.xPos += bluePlayerClosestToBall.player.xPosChangePerFrame
    bluePlayerClosestToBall.player.yPos += bluePlayerClosestToBall.player.yPosChangePerFrame
    let redPlayerClosestToBall = {
        player: {},
        distanceFromBall: 0
    }
    for (let i = 0; i < players.red.length; i++) {
        let redPlayer = players.red[i]
        if (isSendingBall) {
            let distanceFromBall = Math.abs(ball.xPos - redPlayer.xPos) + Math.abs(ball.yPos - redPlayer.yPos)
            if (Object.keys(redPlayerClosestToBall.player).length === 0 || distanceFromBall < redPlayerClosestToBall.distanceFromBall) {
                redPlayerClosestToBall.player = redPlayer
                redPlayerClosestToBall.distanceFromBall = distanceFromBall
            }
        }
        redPlayer.xPos += redPlayer.xPosChangePerFrame
        redPlayer.yPos += redPlayer.yPosChangePerFrame
        stopObjectIfOut(redPlayer)
    }
    redPlayerClosestToBall.player.xPosChangePerFrame = (ball.xPos - redPlayerClosestToBall.player.xPos) * SLOW_MULTIPLIER
    redPlayerClosestToBall.player.yPosChangePerFrame = (ball.yPos - redPlayerClosestToBall.player.yPos) * SLOW_MULTIPLIER
    redPlayerClosestToBall.player.xPos += redPlayerClosestToBall.player.xPosChangePerFrame
    redPlayerClosestToBall.player.yPos += redPlayerClosestToBall.player.yPosChangePerFrame
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
            if (isObjectFarFromObjects(spot, players.blue.concat(players.red).concat(bestOffensiveSpots))) {
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

function setTeamTowardsSpots(team, spots) {
    for (let i = 0; i < spots.length; i++) {
        let spot = spots[i]
        let player = team[i]
        if (player !== sentPlayer) {
            player.xPosChangePerFrame = (spot.xPos - player.xPos) * SLOW_MULTIPLIER
            player.yPosChangePerFrame = (spot.yPos - player.yPos) * SLOW_MULTIPLIER
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
    stopObjectIfOut(ball)
}

function stopBallIfIntercepted() {
    for (let i = 0; i < players.blue.concat(players.red).length; i++) {
        let player = players.blue.concat(players.red)[i]
        let isHorizontallyAlignedWithPlayer = (ball.xPos > player.xPos - PLAYER_RADIUS) && (ball.xPos < player.xPos + PLAYER_RADIUS)
        let isVerticallyAlignedWithPlayer = (ball.yPos > player.yPos - PLAYER_RADIUS) && (ball.yPos < player.yPos + PLAYER_RADIUS)
        let isFarFromTouch1 = (Math.abs(player.xPos - touch1.xPos) > PLAYER_RADIUS) || (Math.abs(player.yPos - touch1.yPos) > PLAYER_RADIUS)
        if (isHorizontallyAlignedWithPlayer && isVerticallyAlignedWithPlayer && isFarFromTouch1 && !hasBeenIntercepted) {
            isSendingBall = false
            hasBeenIntercepted = true
            ball.xPosChangePerFrame = 0
            ball.yPosChangePerFrame = 0
            ballPossessor = player
            resetPlayerPaths()
            setOffensiveAndDefensiveTeams()
        }
    }
}

function setOffensiveAndDefensiveTeams() {
    for (let i = 0; i < players.blue.length; i++) {
        if (ballPossessor === players.blue[i]) {
            offensiveTeam = players.blue
            defensiveTeam = players.red
        }
    }
    for (let i = 0; i < players.red.length; i++) {
        if (ballPossessor === players.red[i]) {
            offensiveTeam = players.red
            defensiveTeam = players.blue
        }
    }
}

function stopObjectIfOut(object) {
    if (object.xPos <= PIXEL_SHIM || object.xPos >= screenWidth - PIXEL_SHIM || object.yPos <= 0 || object.yPos >= screenHeight - PIXEL_SHIM) {
        object.xPosChangePerFrame = 0
        object.yPosChangePerFrame = 0
    }
}

function isObjectFarFromObjects(object, objects) {
    for (let i = 0; i < objects.length; i++) {
        if (Math.abs(object.xPos - objects[i].xPos) < FARNESS_THRESHOLD && Math.abs(object.yPos - objects[i].yPos) < FARNESS_THRESHOLD) {
            return false
        }
    }
    return true
}

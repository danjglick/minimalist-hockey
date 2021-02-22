const MILLISECONDS_PER_FRAME = 16
const BALL_RADIUS = 15
const PLAYER_RADIUS = 30
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 3
const PLAYER_SPEED_MULTIPLIER = 0.005
const BALL_SPEED_MULTIPLIER = 0.025
const FARNESS_THRESHOLD = PLAYER_RADIUS * 5
const FRAMES_BETWEEN_SPOT_SETTINGS = 100

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
let isSendingBall = false
let isSendingPlayer = false
let sentPlayer = {}
let sentPlayerFramesLeft = 0
let isPaused = true
let ballPossessor = {}
let offensiveTeam = players.blue
let defensiveTeam = players.red
let frameCount = 0

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
    if (isSendingBall) {
        isPaused = false
        ball.xPosChangePerFrame = (touch2.xPos - touch1.xPos) * BALL_SPEED_MULTIPLIER
        ball.yPosChangePerFrame = (touch2.yPos - touch1.yPos) * BALL_SPEED_MULTIPLIER
        ballPossessor = {}
    } else if (isSendingPlayer) {
        sentPlayer.xPosChangePerFrame = (touch2.xPos - touch1.xPos) * PLAYER_SPEED_MULTIPLIER
        sentPlayer.yPosChangePerFrame = (touch2.yPos - touch1.yPos) * PLAYER_SPEED_MULTIPLIER
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
        if (frameCount % FRAMES_BETWEEN_SPOT_SETTINGS === 0 || frameCount === 1) {
            setTeamTowardsSpots(offensiveTeam, getBestOffensiveSpots())
            setTeamTowardsSpots(defensiveTeam, getBestDefensiveSpots())
        }
        movePlayers()
        moveBall()
        stopBallIfIntercepted()
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

function movePlayers() {
    if (sentPlayerFramesLeft > 0) {
        sentPlayer.xPos += sentPlayer.xPosChangePerFrame
        sentPlayer.yPos += sentPlayer.yPosChangePerFrame
        sentPlayerFramesLeft--
    }
    for (let i = 0; i < players.blue.length; i++) {
        let bluePlayer = players.blue[i]
        bluePlayer.xPos += bluePlayer.xPosChangePerFrame
        bluePlayer.yPos += bluePlayer.yPosChangePerFrame
        stopObjectIfOut(bluePlayer)
    }
    for (let i = 0; i < players.red.length; i++) {
        let redPlayer = players.red[i]
        redPlayer.xPos += redPlayer.xPosChangePerFrame
        redPlayer.yPos += redPlayer.yPosChangePerFrame
        stopObjectIfOut(redPlayer)
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
            player.xPosChangePerFrame = (spot.xPos - player.xPos) * PLAYER_SPEED_MULTIPLIER
            player.yPosChangePerFrame = (spot.yPos - player.yPos) * PLAYER_SPEED_MULTIPLIER
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
        if (isHorizontallyAlignedWithPlayer && isVerticallyAlignedWithPlayer && isFarFromTouch1) {
            ball.xPosChangePerFrame = 0
            ball.yPosChangePerFrame = 0
            ballPossessor = player
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

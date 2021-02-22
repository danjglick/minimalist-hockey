const MILLISECONDS_PER_FRAME = 16
const BALL_RADIUS = 10
const PLAYER_RADIUS = 20
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS
const FRAMES_PER_SENT_PLAYER = 7
const FAST_MULTIPLIER = 0.03
const SLOW_MULTIPLIER = 0.003
const OPEN_SPACE_THRESHOLD = PLAYER_RADIUS * 5

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
let sentPlayerIndex;
let sentPlayerFramesLeft = 0
let bestOffensiveSpots = []
let isPaused = true
let ballPossessor = {}
let offensiveTeam = []

function initializeGame() {
    canvas = document.getElementById("canvas")
    canvas.width = screenWidth
    canvas.height = screenHeight
    context = canvas.getContext('2d')
    document.addEventListener("touchstart", handleTouchstart)
    document.addEventListener("touchmove", handleTouchmove, {passive: false})
    gameLoop()
}

function gameLoop() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    drawGoals()
    drawBall()
    drawPlayers()
    if (!isPaused) {
        setBestOffensiveSpots()
        setTeamTowardsBestOffensiveSpots(players.blue)
        movePlayers()
        moveBall()
        stopBallIfIntercepted()
        stopBallIfOut()
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
                sentPlayerIndex = i
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
        isPaused = false
        ball.xPosChangePerFrame = xPosChangePerFrame
        ball.yPosChangePerFrame = yPosChangePerFrame
        ballPossessor = {}
    } else if (isSendingPlayer) {
        players.blue[sentPlayerIndex].xPosChangePerFrame = xPosChangePerFrame
        players.blue[sentPlayerIndex].yPosChangePerFrame = yPosChangePerFrame
        sentPlayerFramesLeft = FRAMES_PER_SENT_PLAYER
    }
}

function setBestOffensiveSpots() {
    for (let xPos = PLAYER_RADIUS * 2; xPos < screenWidth; xPos++) {
        for (let yPos = PLAYER_RADIUS * 2; yPos < screenHeight; yPos++) {
            let spot = {
                xPos: xPos,
                yPos: yPos,
            }
            let distanceFromGoal = (offensiveTeam === players.red ? -yPos : yPos)
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
}

function setTeamTowardsBestOffensiveSpots(team) {
    for (let i = 0; i < bestOffensiveSpots.length; i++) {
        if (i === sentPlayerIndex) continue
        let player = team[i]
        player.xPosChangePerFrame = (bestOffensiveSpots[i].xPos - player.xPos) * SLOW_MULTIPLIER
        player.yPosChangePerFrame = (bestOffensiveSpots[i].yPos - player.yPos) * SLOW_MULTIPLIER
    }
}

function movePlayers() {
    if (sentPlayerFramesLeft > 0) { //deal with this
        let sentPlayer = players.blue[sentPlayerIndex]
        sentPlayer.xPos += sentPlayer.xPosChangePerFrame
        sentPlayer.yPos += sentPlayer.yPosChangePerFrame
        sentPlayerFramesLeft--
    }
    for (let i = 0; i < players.blue.length; i++) {
        let bluePlayer = players.blue[i]
        bluePlayer.xPos += bluePlayer.xPosChangePerFrame
        bluePlayer.yPos += bluePlayer.yPosChangePerFrame
    }
}

function moveBall() {
    if (Object.keys(ballPossessor).length > 0) {
        ball.xPosChangePerFrame = ballPossessor.xPosChangePerFrame
        ball.yPosChangePerFrame = ballPossessor.yPosChangePerFrame
    }
    ball.xPos += ball.xPosChangePerFrame
    ball.yPos += ball.yPosChangePerFrame
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
        }
    }
}

function stopBallIfOut() {
    if (ball.xPos <= PIXEL_SHIM || ball.xPos >= screenWidth - PIXEL_SHIM || ball.yPos <= 0 || ball.yPos >= screenHeight - PIXEL_SHIM) {
        ball.xPosChangePerFrame = 0
        ball.yPosChangePerFrame = 0
    }
}

function isObjectFarFromObjects(object, objects) {
    for (let i = 0; i < objects.length; i++) {
        if (Math.abs(object.xPos - objects[i].xPos) < OPEN_SPACE_THRESHOLD && Math.abs(object.yPos - objects[i].yPos) < OPEN_SPACE_THRESHOLD) {
            return false
        }
    }
    return true
}

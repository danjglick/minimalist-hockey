const MILLISECONDS_PER_FRAME = 1
const BALL_RADIUS = 10
const PLAYER_RADIUS = 20
const PIXEL_SHIM = BALL_RADIUS + PLAYER_RADIUS

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
let blueTeam = [
    {
        xPos: screenWidth * 0.5,
        yPos: screenHeight * 0.5 + PIXEL_SHIM,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: -10
    },
    {
        xPos: screenWidth * 0.2,
        yPos: screenHeight * 0.75,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: -10
    },
    {
        xPos: screenWidth * 0.8,
        yPos: screenHeight * 0.75,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: -10
    },
    {
        xPos: screenWidth * 0.5,
        yPos: screenHeight - PIXEL_SHIM,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: -10
    }

]
let redTeam = [
    {
        xPos: screenWidth * 0.5,
        yPos: (screenHeight * 0.5) - (PIXEL_SHIM * 3),
        xPosChangePerFrame: 0,
        yPosChangePerFrame: 20
    },
    {
        xPos: screenWidth * 0.2,
        yPos: screenHeight * 0.25,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: 20
    },
    {
        xPos: screenWidth * 0.8,
        yPos: screenHeight * 0.25,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: 20
    },
    {
        xPos: screenWidth * 0.5,
        yPos: PIXEL_SHIM,
        xPosChangePerFrame: 0,
        yPosChangePerFrame: 20
    },
]
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
let ballPossessor = {}

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
    getBallPossessor()
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
    ball.xPos += ball.xPosChangePerFrame
    ball.yPos += ball.yPosChangePerFrame
    context.beginPath()
    context.arc(ball.xPos, ball.yPos, BALL_RADIUS, 0, 2 * Math.PI)
    context.fillStyle = "yellow"
    context.fill()
}

function drawPlayers() {
    for (let i = 0; i < blueTeam.length; i++) {
        let bluePlayer = blueTeam[i]
        context.beginPath()
        context.arc(bluePlayer.xPos, bluePlayer.yPos, PLAYER_RADIUS, 0, 2 * Math.PI)
        context.fillStyle = "Cornflowerblue"
        context.fill()
    }
    for (let i = 0; i < redTeam.length; i++) {
        let redPlayer = redTeam[i]
        context.beginPath()
        context.arc(redPlayer.xPos, redPlayer.yPos, PLAYER_RADIUS, 0, 2 * Math.PI)
        context.fillStyle = "indianRed"
        context.fill()
    }
}

function handleTouchstart(event) {
    touch1.xPos = event.touches[0].clientX
    touch1.yPos = event.touches[0].clientY
    for (let i = 0; i < blueTeam.length; i++) {
        let bluePlayer = blueTeam[i]
        let horizontallyAligned = (touch1.xPos > bluePlayer.xPos - PLAYER_RADIUS) && (touch1.xPos < bluePlayer.xPos + PLAYER_RADIUS)
        let verticallyAligned = (touch1.yPos > bluePlayer.yPos - PLAYER_RADIUS) && (touch1.yPos < bluePlayer.yPos + PLAYER_RADIUS)
        if (horizontallyAligned && verticallyAligned) {
            if ((ball.xPos === bluePlayer.xPos) && (ball.yPos === bluePlayer.yPos - PIXEL_SHIM)) {
                isSendingBall = true
            }
            else {
                isSendingPlayer = true
            }
        }
    }
}

function handleTouchmove(event) {
    event.preventDefault()
    touch2.xPos = event.touches[0].clientX
    touch2.yPos = event.touches[0].clientY
    if (isSendingBall) {
        ball.xPosChangePerFrame = (touch2.xPos - touch1.xPos) / 100
        ball.yPosChangePerFrame = (touch2.yPos - touch1.yPos) / 100
    }
}

function getBallPossessor() {
    let players = blueTeam.concat(redTeam)
    for (let i = 0; i < players.length; i++) {
        let player = players[i]
        let horizontallyAligned = (ball.xPos > player.xPos - PLAYER_RADIUS) && (ball.xPos < player.xPos + PLAYER_RADIUS)
        let verticallyAligned = (ball.yPos > player.yPos - PLAYER_RADIUS) && (ball.yPos < player.yPos + PLAYER_RADIUS)
        if (horizontallyAligned && verticallyAligned) {
            ball.xPosChangePerFrame = 0
            ball.yPosChangePerFrame = 0
            return player
        }
    }
}

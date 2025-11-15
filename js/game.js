// 游戏核心类
class WallGame {
    constructor(config) {
        this.config = config;
        this.boardSize = config.boardSize;
        this.players = this.initializePlayers(config.playerConfigs);
        this.currentPlayer = 0;
        this.phase = 'placement';
        this.gameOver = false;
        
        // 游戏状态
        this.cells = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.horizontalWalls = Array(this.boardSize + 1).fill().map(() => Array(this.boardSize).fill(false));
        this.verticalWalls = Array(this.boardSize + 1).fill().map(() => Array(this.boardSize).fill(false));
        
        // UI状态
        this.selectedPiece = null;
        this.hasMoved = false;
        this.wallOptions = [];
        
        // 游戏历史
        this.history = [];
        this.turnCount = 1;
        
        // AI玩家
        this.aiPlayers = this.initializeAIPlayers();
        
        this.init();
    }

    initializePlayers(playerConfigs) {
        return playerConfigs.map((config, index) => ({
            id: index,
            name: config.name,
            type: config.type,
            color: config.color,
            pieces: [],
            walls: this.config.maxWalls,
            score: 0
        }));
    }

    initializeAIPlayers() {
        const aiPlayers = new Map();
        this.players.forEach(player => {
            if (player.type.startsWith('ai-')) {
                const difficulty = player.type.split('-')[1];
                aiPlayers.set(player.id, new AIPlayer(difficulty, player.id));
            }
        });
        return aiPlayers;
    }

    init() {
        console.log('初始化游戏，棋盘大小:', this.boardSize);
        this.createBoard();
        this.bindEvents();
        this.updateUI();
        this.addGameLog('游戏开始！');
        
        // 如果第一个玩家是AI，自动开始
        if (this.isCurrentPlayerAI()) {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }

    createBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) {
            console.error('找不到游戏棋盘元素 #game-board');
            return;
        }

        // 清除现有内容
        gameBoard.innerHTML = '';
        
        // 设置棋盘尺寸和样式
        const boardSizePx = 400;
        gameBoard.style.width = `${boardSizePx}px`;
        gameBoard.style.height = `${boardSizePx}px`;
        gameBoard.style.position = 'relative';
        gameBoard.style.background = '#f8f9fa';
        gameBoard.style.border = '2px solid #2c3e50';
        gameBoard.style.borderRadius = '8px';
        gameBoard.style.margin = '0 auto';
        gameBoard.style.overflow = 'visible';

        // 设置棋盘网格
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gap = '0px';
        
        const fragment = document.createDocumentFragment();

        // 创建单元格
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // 设置单元格样式
                cell.style.border = '1px solid #95a5a6';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.position = 'relative';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.15s ease';
                cell.style.backgroundColor = '#ffffff';
                
                cell.addEventListener('click', (e) => {
                    console.log('单元格被点击:', x, y);
                    e.stopPropagation();
                    this.handleCellClick(x, y);
                });
                
                fragment.appendChild(cell);
            }
        }

        gameBoard.appendChild(fragment);
        this.drawWalls();
        
        console.log('棋盘创建完成');
    }

    drawWalls() {
        // 清除现有围墙
        const existingWalls = document.querySelectorAll('.wall');
        existingWalls.forEach(wall => wall.remove());

        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const boardSizePx = 400;
        const cellSize = boardSizePx / this.boardSize;
        const fragment = document.createDocumentFragment();

        // 绘制水平围墙
        for (let y = 0; y < this.horizontalWalls.length; y++) {
            for (let x = 0; x < this.horizontalWalls[y].length; x++) {
                if (this.horizontalWalls[y][x]) {
                    const wall = document.createElement('div');
                    wall.className = 'wall horizontal';
                    wall.style.cssText = `
                        position: absolute;
                        background-color: #2c3e50;
                        width: ${cellSize}px;
                        height: 6px;
                        left: ${x * cellSize}px;
                        top: ${(y - 0.5) * cellSize}px;
                        z-index: 2;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    `;
                    fragment.appendChild(wall);
                }
            }
        }

        // 绘制垂直围墙
        for (let x = 0; x < this.verticalWalls.length; x++) {
            for (let y = 0; y < this.verticalWalls[x].length; y++) {
                if (this.verticalWalls[x][y]) {
                    const wall = document.createElement('div');
                    wall.className = 'wall vertical';
                    wall.style.cssText = `
                        position: absolute;
                        background-color: #2c3e50;
                        width: 6px;
                        height: ${cellSize}px;
                        left: ${(x - 0.5) * cellSize}px;
                        top: ${y * cellSize}px;
                        z-index: 2;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    `;
                    fragment.appendChild(wall);
                }
            }
        }

        gameBoard.appendChild(fragment);
    }

    bindEvents() {
        console.log('开始绑定事件...');
        
        // 直接绑定按钮事件
        this.bindButtonEvents();
        
        // 绑定模态框事件
        this.bindModalEvents();
    }

    bindButtonEvents() {
        // 菜单按钮
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                console.log('菜单按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.showPauseMenu();
            });
        }

        // 重新开始按钮
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                console.log('重新开始按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.restartGame();
            });
        }

        // 悔棋按钮
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', (e) => {
                console.log('悔棋按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.undoMove();
            });
        }

        // 更换棋子按钮
        const changePieceBtn = document.getElementById('change-piece-btn');
        if (changePieceBtn) {
            changePieceBtn.addEventListener('click', (e) => {
                console.log('更换棋子按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.changePiece();
            });
        }

        // 跳过回合按钮
        const passTurnBtn = document.getElementById('pass-turn-btn');
        if (passTurnBtn) {
            passTurnBtn.addEventListener('click', (e) => {
                console.log('跳过回合按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.passTurn();
            });
        }

        // 暂停按钮
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', (e) => {
                console.log('暂停按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.showPauseMenu();
            });
        }

        // 提示按钮
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', (e) => {
                console.log('提示按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.showHints();
            });
        }
    }

    bindModalEvents() {
        // 暂停菜单按钮
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hidePauseMenu();
            });
        }

        const restartModalBtn = document.getElementById('restart-modal-btn');
        if (restartModalBtn) {
            restartModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.restartGame();
            });
        }

        const menuModalBtn = document.getElementById('menu-modal-btn');
        if (menuModalBtn) {
            menuModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.returnToMenu();
            });
        }

        const settingsModalBtn = document.getElementById('settings-modal-btn');
        if (settingsModalBtn) {
            settingsModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSettings();
            });
        }

        // 游戏结束按钮
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.restartGame();
            });
        }

        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.returnToMenu();
            });
        }

        const reviewGameBtn = document.getElementById('review-game-btn');
        if (reviewGameBtn) {
            reviewGameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.reviewGame();
            });
        }
    }

    handleCellClick(x, y) {
        console.log(`处理单元格点击: (${x}, ${y})`, {
            gameOver: this.gameOver,
            isAI: this.isCurrentPlayerAI(),
            phase: this.phase,
            selectedPiece: this.selectedPiece,
            hasMoved: this.hasMoved
        });
        
        if (this.gameOver) {
            console.log('游戏已结束，忽略点击');
            return;
        }
        
        if (this.isCurrentPlayerAI()) {
            console.log('AI回合，忽略点击');
            return;
        }

        if (this.phase === 'placement') {
            this.placePiece(x, y);
        } else if (this.phase === 'movement') {
            if (!this.selectedPiece) {
                this.selectPiece(x, y);
            } else if (!this.hasMoved) {
                this.movePiece(x, y);
            }
        }
    }

    placePiece(x, y) {
        const currentPlayer = this.players[this.currentPlayer];
        
        if (currentPlayer.pieces.length >= 4) {
            console.log('该玩家已放置完所有棋子');
            return;
        }
        if (this.cells[y][x] !== null) {
            console.log('该位置已有棋子');
            return;
        }

        console.log(`玩家 ${currentPlayer.name} 在 (${x}, ${y}) 放置棋子`);
        this.saveGameState();
        
        this.cells[y][x] = this.currentPlayer;
        currentPlayer.pieces.push({ x, y });

        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
            const piece = document.createElement('div');
            piece.className = `piece ${currentPlayer.color}`;
            piece.style.cssText = `
                width: 70%;
                height: 70%;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--${currentPlayer.color}-color), var(--${currentPlayer.color}-dark));
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
                position: relative;
                z-index: 10;
            `;
            cell.appendChild(piece);
        }

        this.addGameLog(`${currentPlayer.name} 放置了棋子`);
        
        this.switchToNextPlayer();
        this.checkPhaseTransition();
        this.updateUI();

        // 检查AI移动
        if (this.isCurrentPlayerAI()) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    selectPiece(x, y) {
        const cellOwner = this.cells[y][x];
        if (cellOwner === this.currentPlayer) {
            if (this.isPieceTrapped(x, y)) {
                this.showMessage('这个棋子已被困住，无法移动！');
                return;
            }
            
            this.selectedPiece = { x, y };
            this.clearHighlights();
            
            const selectedCell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (selectedCell) {
                selectedCell.style.backgroundColor = 'rgba(241, 196, 15, 0.3)';
                selectedCell.style.border = '2px solid #f1c40f';
            }
            
            this.showValidMoves(x, y);
        }
    }

    movePiece(x, y) {
        if (!this.selectedPiece) return;

        const fromX = this.selectedPiece.x;
        const fromY = this.selectedPiece.y;

        if (!this.isValidMove(fromX, fromY, x, y)) {
            console.log('无效移动');
            return;
        }

        console.log(`移动棋子从 (${fromX}, ${fromY}) 到 (${x}, ${y})`);
        this.saveGameState();

        this.cells[fromY][fromX] = null;
        this.cells[y][x] = this.currentPlayer;

        // 移动DOM元素
        const fromCell = document.querySelector(`.cell[data-x="${fromX}"][data-y="${fromY}"]`);
        const toCell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        
        if (fromCell && toCell) {
            const piece = fromCell.querySelector('.piece');
            if (piece) {
                fromCell.removeChild(piece);
                toCell.appendChild(piece);
                
                // 重置单元格样式
                fromCell.style.backgroundColor = '';
                fromCell.style.border = '1px solid #95a5a6';
            }
        }

        // 更新棋子位置
        const currentPlayer = this.players[this.currentPlayer];
        const pieceObj = currentPlayer.pieces.find(p => p.x === fromX && p.y === fromY);
        if (pieceObj) {
            pieceObj.x = x;
            pieceObj.y = y;
        }

        this.hasMoved = true;
        this.clearHighlights();
        
        this.addGameLog(`${currentPlayer.name} 移动了棋子`);
        
        this.showWallOptions(x, y);
    }

    showValidMoves(x, y) {
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];
        
        directions.forEach(dir => {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            if (this.isValidMove(x, y, newX, newY)) {
                const cell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);
                if (cell) {
                    cell.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
                    cell.style.border = '2px solid #3498db';
                }
            }
        });
    }

    clearHighlights() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.backgroundColor = '';
            cell.style.border = '1px solid #95a5a6';
        });
    }

    showWallOptions(x, y) {
        this.clearWallOptions();

        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const boardSizePx = 400;
        const cellSize = boardSizePx / this.boardSize;
        const options = [];
        const fragment = document.createDocumentFragment();

        console.log(`在位置 (${x}, ${y}) 显示围墙选项`);

        // 水平围墙选项
        if (y > 0) {
            options.push({
                number: 1,
                wallX: x,
                wallY: y,
                orientation: 'horizontal',
                left: x * cellSize + cellSize / 2 - 15,
                top: y * cellSize - 15
            });
        }

        if (y < this.boardSize) {
            options.push({
                number: 2,
                wallX: x,
                wallY: y + 1,
                orientation: 'horizontal',
                left: x * cellSize + cellSize / 2 - 15,
                top: y * cellSize + cellSize - 15
            });
        }

        // 垂直围墙选项
        if (x > 0) {
            options.push({
                number: 3,
                wallX: x,
                wallY: y,
                orientation: 'vertical',
                left: x * cellSize - 15,
                top: y * cellSize + cellSize / 2 - 15
            });
        }

        if (x < this.boardSize) {
            options.push({
                number: 4,
                wallX: x + 1,
                wallY: y,
                orientation: 'vertical',
                left: x * cellSize + cellSize - 15,
                top: y * cellSize + cellSize / 2 - 15
            });
        }

        options.forEach(option => {
            if (this.canPlaceWall(option.wallX, option.wallY, option.orientation)) {
                const wallOption = document.createElement('div');
                wallOption.className = 'wall-option';
                wallOption.textContent = option.number;
                wallOption.style.cssText = `
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 20;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
                    transition: all 0.3s ease;
                    border: 3px solid white;
                    left: ${option.left}px;
                    top: ${option.top}px;
                `;

                wallOption.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log(`选择围墙选项 ${option.number}`);
                    this.placeWall(option.wallX, option.wallY, option.orientation);
                });

                fragment.appendChild(wallOption);
                this.wallOptions.push(wallOption);
            }
        });

        gameBoard.appendChild(fragment);
    }

    clearWallOptions() {
        this.wallOptions.forEach(option => {
            if (option.parentNode) {
                option.parentNode.removeChild(option);
            }
        });
        this.wallOptions = [];
    }

    // 其他方法保持不变...
    showPauseMenu() {
        console.log('显示暂停菜单');
        const modal = document.getElementById('pause-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    hidePauseMenu() {
        console.log('隐藏暂停菜单');
        const modal = document.getElementById('pause-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    restartGame() {
        console.log('重新开始游戏');
        if (confirm('确定要重新开始游戏吗？')) {
            window.location.reload();
        }
    }

    returnToMenu() {
        console.log('返回菜单');
        if (confirm('确定要返回主菜单吗？当前游戏进度将丢失。')) {
            window.location.href = 'index.html';
        }
    }

    showSettings() {
        console.log('显示设置');
        alert('设置功能将在后续版本中添加');
    }

    showHints() {
        console.log('显示提示');
        if (!this.config.showHints) {
            this.showMessage('提示功能已禁用，请在设置中启用');
            return;
        }
        this.showMessage('提示：尽量将棋子放置在棋盘中央区域');
    }

    showMessage(message) {
        console.log('显示消息:', message);
        alert(message);
    }

    addGameLog(message) {
        console.log('添加游戏日志:', message);
        const logContent = document.getElementById('game-log');
        if (!logContent) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    updateUI() {
        console.log('更新UI');
        // 简化UI更新逻辑
        this.players.forEach((player, index) => {
            const piecesElement = document.getElementById(`player${index + 1}-pieces`);
            const wallsElement = document.getElementById(`player${index + 1}-walls`);
            const scoreElement = document.getElementById(`player${index + 1}-score`);
            
            if (piecesElement) piecesElement.textContent = `${player.pieces.length}/4`;
            if (wallsElement) wallsElement.textContent = this.config.maxWalls === 999 ? '∞' : player.walls;
            if (scoreElement) scoreElement.textContent = player.score;
        });

        // 更新当前玩家指示
        this.players.forEach((player, index) => {
            const playerInfo = document.getElementById(`player${index + 1}-info`);
            if (playerInfo) {
                playerInfo.classList.toggle('active', index === this.currentPlayer);
            }
        });
    }

    // 其他必要的方法...
    isValidMove(fromX, fromY, toX, toY) {
        if (toX < 0 || toX >= this.boardSize || toY < 0 || toY >= this.boardSize) {
            return false;
        }
        if (this.cells[toY][toX] !== null) {
            return false;
        }
        
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            return true; // 简化移动验证
        }
        return false;
    }

    canPlaceWall(x, y, orientation) {
        return true; // 简化围墙放置验证
    }

    isPieceTrapped(x, y) {
        return false; // 简化棋子困住检查
    }

    switchToNextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.hasMoved = false;
        this.selectedPiece = null;
        this.turnCount++;
        this.clearHighlights();
        this.clearWallOptions();
    }

    checkPhaseTransition() {
        let allPlayersHave4Pieces = true;
        for (const player of this.players) {
            if (player.pieces.length < 4) {
                allPlayersHave4Pieces = false;
                break;
            }
        }
        
        if (allPlayersHave4Pieces && this.phase === 'placement') {
            this.phase = 'movement';
            this.addGameLog('进入移动阶段！');
        }
    }

    isCurrentPlayerAI() {
        const currentPlayer = this.players[this.currentPlayer];
        return currentPlayer.type.startsWith('ai-');
    }

    async makeAIMove() {
        console.log('AI开始思考...');
        // 简化AI移动
        if (this.phase === 'placement') {
            // 随机放置棋子
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    if (this.cells[y][x] === null) {
                        this.placePiece(x, y);
                        return;
                    }
                }
            }
        }
    }

    placeWall(x, y, orientation) {
        console.log(`放置围墙: (${x}, ${y}), 方向: ${orientation}`);
        // 简化围墙放置
        this.switchToNextPlayer();
        this.updateUI();
    }

    saveGameState() {
        // 简化历史记录
        this.history.push({
            cells: JSON.parse(JSON.stringify(this.cells)),
            currentPlayer: this.currentPlayer
        });
    }

    undoMove() {
        console.log('悔棋');
        if (this.history.length > 1) {
            this.history.pop();
            const state = this.history.pop();
            this.cells = state.cells;
            this.currentPlayer = state.currentPlayer;
            this.recreateBoard();
            this.updateUI();
        }
    }

    recreateBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;
        
        gameBoard.innerHTML = '';
        this.createBoard();
    }

    changePiece() {
        console.log('更换棋子');
        this.selectedPiece = null;
        this.clearHighlights();
    }

    passTurn() {
        console.log('跳过回合');
        this.switchToNextPlayer();
        this.updateUI();
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== 游戏页面加载完成 ===');
    
    // 检查所有必要的元素
    const requiredElements = [
        'game-board', 'menu-btn', 'restart-btn', 'undo-btn', 
        'change-piece-btn', 'pass-turn-btn', 'pause-btn', 'hint-btn'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`元素 #${id}:`, element ? '找到' : '未找到');
    });
    
    const gameConfig = Utils.storage.get('currentGameConfig');
    console.log('加载的游戏配置:', gameConfig);
    
    if (gameConfig) {
        console.log('开始初始化游戏...');
        try {
            new WallGame(gameConfig);
            console.log('游戏初始化成功！');
        } catch (error) {
            console.error('游戏初始化失败:', error);
        }
    } else {
        console.error('没有找到游戏配置');
        alert('没有找到游戏配置，返回主菜单');
        window.location.href = 'index.html';
    }
});

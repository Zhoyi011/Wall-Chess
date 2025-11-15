
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
        const boardSizePx = 400; // 减小尺寸避免覆盖其他元素
        gameBoard.style.width = `${boardSizePx}px`;
        gameBoard.style.height = `${boardSizePx}px`;
        gameBoard.style.position = 'relative';
        gameBoard.style.background = '#f8f9fa';
        gameBoard.style.border = '2px solid #2c3e50';
        gameBoard.style.borderRadius = '8px';
        gameBoard.style.margin = '0 auto';

        // 设置棋盘网格
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gap = '0px';
        
        // 设置CSS变量
        document.documentElement.style.setProperty('--board-size', this.boardSize);

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
                
                // 确保单元格可以接收点击事件
                cell.style.zIndex = '1';
                cell.style.pointerEvents = 'auto';
                
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleCellClick(x, y);
                });
                
                fragment.appendChild(cell);
            }
        }

        gameBoard.appendChild(fragment);
        this.drawWalls();
        
        console.log('棋盘创建完成，单元格数量:', this.boardSize * this.boardSize);
    }

    drawWalls() {
        console.log('开始绘制围墙...');
        
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
                        pointer-events: none;
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
                        pointer-events: none;
                    `;
                    fragment.appendChild(wall);
                }
            }
        }

        gameBoard.appendChild(fragment);
        console.log('围墙绘制完成');
    }

    bindEvents() {
        console.log('绑定游戏事件...');
        
        // 使用事件委托来确保按钮能正确响应
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 菜单按钮
            if (target.id === 'menu-btn' || target.closest('#menu-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showPauseMenu();
                return;
            }
            
            // 重新开始按钮
            if (target.id === 'restart-btn' || target.closest('#restart-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.restartGame();
                return;
            }
            
            // 悔棋按钮
            if (target.id === 'undo-btn' || target.closest('#undo-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.undoMove();
                return;
            }
            
            // 更换棋子按钮
            if (target.id === 'change-piece-btn' || target.closest('#change-piece-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.changePiece();
                return;
            }
            
            // 跳过回合按钮
            if (target.id === 'pass-turn-btn' || target.closest('#pass-turn-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.passTurn();
                return;
            }
            
            // 暂停按钮
            if (target.id === 'pause-btn' || target.closest('#pause-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showPauseMenu();
                return;
            }
            
            // 提示按钮
            if (target.id === 'hint-btn' || target.closest('#hint-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showHints();
                return;
            }
        });

        // 暂停菜单按钮
        document.getElementById('resume-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hidePauseMenu();
        });

        document.getElementById('restart-modal-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.restartGame();
        });

        document.getElementById('menu-modal-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.returnToMenu();
        });

        document.getElementById('settings-modal-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showSettings();
        });

        // 游戏结束按钮
        document.getElementById('play-again-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.restartGame();
        });

        document.getElementById('back-to-menu-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.returnToMenu();
        });

        document.getElementById('review-game-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.reviewGame();
        });

        // 防止棋盘容器阻止事件传播
        const boardContainer = document.querySelector('.board-container');
        if (boardContainer) {
            boardContainer.style.pointerEvents = 'none';
        }
        
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            gameBoard.style.pointerEvents = 'auto';
        }
    }

    handleCellClick(x, y) {
        console.log(`点击单元格: (${x}, ${y})`);
        if (this.gameOver || this.isCurrentPlayerAI()) {
            console.log('游戏已结束或AI回合，忽略点击');
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
            // 清除可能存在的旧棋子
            const existingPiece = cell.querySelector('.piece');
            if (existingPiece) {
                existingPiece.remove();
            }
            
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
                pointer-events: none;
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
                    pointer-events: auto;
                `;

                wallOption.dataset.wallX = option.wallX;
                wallOption.dataset.wallY = option.wallY;
                wallOption.dataset.orientation = option.orientation;

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
        console.log(`显示了 ${this.wallOptions.length} 个围墙选项`);
    }

    clearWallOptions() {
        this.wallOptions.forEach(option => {
            if (option.parentNode) {
                option.parentNode.removeChild(option);
            }
        });
        this.wallOptions = [];
    }

    // ... 其他方法保持不变

}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('游戏页面加载完成');
    
    const gameConfig = Utils.storage.get('currentGameConfig');
    console.log('加载的游戏配置:', gameConfig);
    
    if (gameConfig) {
        // 更新游戏信息显示
        const gameMode = document.getElementById('game-mode');
        const boardSize = document.getElementById('board-size');
        
        if (gameMode) {
            gameMode.textContent = gameConfig.mode === 'single' ? 
                `单人游戏 - ${gameConfig.difficulty}难度` : 
                `多人游戏 - ${gameConfig.players}人`;
        }
        
        if (boardSize) {
            boardSize.textContent = `${gameConfig.boardSize}×${gameConfig.boardSize}`;
        }
        
        // 初始化游戏
        console.log('开始初始化游戏...');
        new WallGame(gameConfig);
    } else {
        // 如果没有游戏配置，返回主菜单
        console.error('没有找到游戏配置');
        alert('没有找到游戏配置，返回主菜单');
        window.location.href = 'index.html';
    }
});

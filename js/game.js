
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
            this.makeAIMove();
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
        const boardSizePx = 500; // 固定尺寸
        gameBoard.style.width = `${boardSizePx}px`;
        gameBoard.style.height = `${boardSizePx}px`;
        gameBoard.style.position = 'relative';
        gameBoard.style.background = 'var(--light-color)';
        gameBoard.style.border = '3px solid var(--dark-color)';
        gameBoard.style.borderRadius = '8px';

        // 设置棋盘网格
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        
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
                cell.style.border = '1px solid var(--gray-color)';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.position = 'relative';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.15s ease';
                
                cell.addEventListener('click', () => this.handleCellClick(x, y));
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

        const boardSizePx = 500;
        const cellSize = boardSizePx / this.boardSize;
        const fragment = document.createDocumentFragment();

        console.log('绘制水平围墙...');
        // 绘制水平围墙
        for (let y = 0; y < this.horizontalWalls.length; y++) {
            for (let x = 0; x < this.horizontalWalls[y].length; x++) {
                if (this.horizontalWalls[y][x]) {
                    const wall = document.createElement('div');
                    wall.className = 'wall horizontal';
                    wall.style.cssText = `
                        position: absolute;
                        background-color: var(--dark-color);
                        width: ${cellSize}px;
                        height: 6px;
                        left: ${x * cellSize}px;
                        top: ${(y - 0.5) * cellSize}px;
                        z-index: 5;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    `;
                    fragment.appendChild(wall);
                    console.log(`绘制水平围墙: (${x}, ${y})`);
                }
            }
        }

        console.log('绘制垂直围墙...');
        // 绘制垂直围墙
        for (let x = 0; x < this.verticalWalls.length; x++) {
            for (let y = 0; y < this.verticalWalls[x].length; y++) {
                if (this.verticalWalls[x][y]) {
                    const wall = document.createElement('div');
                    wall.className = 'wall vertical';
                    wall.style.cssText = `
                        position: absolute;
                        background-color: var(--dark-color);
                        width: 6px;
                        height: ${cellSize}px;
                        left: ${(x - 0.5) * cellSize}px;
                        top: ${y * cellSize}px;
                        z-index: 5;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    `;
                    fragment.appendChild(wall);
                    console.log(`绘制垂直围墙: (${x}, ${y})`);
                }
            }
        }

        gameBoard.appendChild(fragment);
        console.log('围墙绘制完成');
    }

    bindEvents() {
        console.log('绑定游戏事件...');
        
        // 游戏控制按钮
        document.getElementById('menu-btn')?.addEventListener('click', () => {
            this.showPauseMenu();
        });

        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('undo-btn')?.addEventListener('click', () => {
            this.undoMove();
        });

        document.getElementById('change-piece-btn')?.addEventListener('click', () => {
            this.changePiece();
        });

        document.getElementById('pass-turn-btn')?.addEventListener('click', () => {
            this.passTurn();
        });

        document.getElementById('pause-btn')?.addEventListener('click', () => {
            this.showPauseMenu();
        });

        document.getElementById('hint-btn')?.addEventListener('click', () => {
            this.showHints();
        });

        // 暂停菜单按钮
        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.hidePauseMenu();
        });

        document.getElementById('restart-modal-btn')?.addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('menu-modal-btn')?.addEventListener('click', () => {
            this.returnToMenu();
        });

        document.getElementById('settings-modal-btn')?.addEventListener('click', () => {
            this.showSettings();
        });

        // 游戏结束按钮
        document.getElementById('play-again-btn')?.addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('back-to-menu-btn')?.addEventListener('click', () => {
            this.returnToMenu();
        });

        document.getElementById('review-game-btn')?.addEventListener('click', () => {
            this.reviewGame();
        });
    }

    handleCellClick(x, y) {
        console.log(`点击单元格: (${x}, ${y})`);
        if (this.gameOver || this.isCurrentPlayerAI()) return;

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
            this.makeAIMove();
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
                selectedCell.classList.add('selected');
                selectedCell.style.backgroundColor = 'rgba(241, 196, 15, 0.3)';
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

    // ... 其他方法保持不变，但添加更多调试信息

    showWallOptions(x, y) {
        this.clearWallOptions();

        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const boardSizePx = 500;
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
                    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 15;
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

                wallOption.dataset.wallX = option.wallX;
                wallOption.dataset.wallY = option.wallY;
                wallOption.dataset.orientation = option.orientation;

                wallOption.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log(`选择围墙选项 ${option.number}`);
                    this.placeWall(option.wallX, option.wallY, option.orientation);
                });

                wallOption.addEventListener('mouseenter', () => {
                    wallOption.style.transform = 'scale(1.3)';
                });

                wallOption.addEventListener('mouseleave', () => {
                    wallOption.style.transform = 'scale(1)';
                });

                fragment.appendChild(wallOption);
                this.wallOptions.push(wallOption);
            }
        });

        gameBoard.appendChild(fragment);
        console.log(`显示了 ${this.wallOptions.length} 个围墙选项`);
    }

    // ... 其他方法保持不变

    updateUI() {
        console.log('更新UI...');
        
        // 更新玩家信息
        this.players.forEach((player, index) => {
            const playerInfo = document.getElementById(`player${index + 1}-info`);
            if (playerInfo) {
                playerInfo.classList.toggle('active', index === this.currentPlayer);
                playerInfo.classList.toggle('hidden', index >= this.players.length);
                
                const piecesElement = document.getElementById(`player${index + 1}-pieces`);
                const wallsElement = document.getElementById(`player${index + 1}-walls`);
                const scoreElement = document.getElementById(`player${index + 1}-score`);
                
                if (piecesElement) piecesElement.textContent = `${player.pieces.length}/4`;
                if (wallsElement) wallsElement.textContent = this.config.maxWalls === 999 ? '∞' : player.walls;
                if (scoreElement) scoreElement.textContent = player.score;
            }
        });

        // 更新阶段指示器
        const phaseIndicator = document.getElementById('phase-indicator');
        const phaseText = document.querySelector('.phase-text');
        if (phaseIndicator && phaseText) {
            const phaseIcon = phaseIndicator.querySelector('.phase-icon');
            if (this.phase === 'placement') {
                phaseIcon.textContent = '🎯';
                phaseText.textContent = '放置阶段';
            } else {
                phaseIcon.textContent = '🚶';
                phaseText.textContent = '移动阶段';
            }
        }

        // 更新回合信息
        const currentPlayer = this.players[this.currentPlayer];
        const turnText = document.querySelector('.turn-text');
        if (turnText) {
            turnText.textContent = `${currentPlayer.name}的回合`;
        }
        
        const turnCount = document.getElementById('turn-count');
        if (turnCount) {
            turnCount.textContent = this.turnCount;
        }

        // 更新控制按钮状态
        const changePieceBtn = document.getElementById('change-piece-btn');
        const undoBtn = document.getElementById('undo-btn');
        
        if (changePieceBtn) {
            changePieceBtn.disabled = this.phase !== 'movement' || this.hasMoved || this.selectedPiece === null;
        }
        
        if (undoBtn) {
            undoBtn.disabled = this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI();
        }

        // 更新底部状态
        const currentAction = document.getElementById('current-action');
        if (currentAction) {
            if (this.phase === 'placement') {
                currentAction.textContent = '请放置你的棋子';
            } else if (this.selectedPiece) {
                currentAction.textContent = '请选择移动位置或放置围墙';
            } else {
                currentAction.textContent = '请选择要移动的棋子';
            }
        }

        // 更新游戏状态
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
            gameStatus.textContent = this.gameOver ? '游戏结束' : '游戏进行中...';
        }
        
        console.log('UI更新完成');
    }
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

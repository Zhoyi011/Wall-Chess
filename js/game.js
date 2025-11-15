// 游戏核心类 - 完整版本
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
        this.territories = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        
        // UI状态
        this.selectedPiece = null;
        this.hasMoved = false;
        this.wallOptions = [];
        this.touchStartTime = 0;
        this.lastTouch = { x: 0, y: 0 };
        this.isTouchDevice = false;
        
        // 游戏历史
        this.history = [];
        this.turnCount = 1;
        this.gameStartTime = Date.now();
        
        // AI玩家
        this.aiPlayers = this.initializeAIPlayers();
        
        // 移动端检测
        this.detectTouchDevice();
        
        this.init();
    }

    detectTouchDevice() {
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        console.log('触摸设备检测:', this.isTouchDevice);
    }

    initializePlayers(playerConfigs) {
        return playerConfigs.map((config, index) => ({
            id: index,
            name: config.name,
            type: config.type,
            color: config.color,
            pieces: [],
            walls: this.config.maxWalls,
            score: 0,
            territories: []
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
        console.log('初始化游戏，棋盘大小:', this.boardSize, '玩家:', this.players);
        this.createBoard();
        this.bindEvents();
        this.updateUI();
        this.addGameLog('游戏开始！');
        
        // 应用设置
        this.applySettings();
        
        // 如果第一个玩家是AI，自动开始
        if (this.isCurrentPlayerAI()) {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }

    applySettings() {
        // 应用音效设置
        if (settingsManager.settings.soundEnabled) {
            soundManager.setEnabled(true);
        }
        
        // 应用动画设置
        document.documentElement.style.setProperty('--animation-speed', 
            settingsManager.settings.animationsEnabled ? '1' : '0');
    }

    createBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) {
            console.error('找不到游戏棋盘元素 #game-board');
            this.showError('无法创建游戏棋盘，请刷新页面重试');
            return;
        }

        try {
            // 清除现有内容
            gameBoard.innerHTML = '';
            
            // 设置棋盘尺寸和样式 - 移动端适配
            const isMobile = this.isMobileDevice();
            const boardSizePx = isMobile ? Math.min(window.innerWidth - 40, 500) : 500;
            gameBoard.style.width = `${boardSizePx}px`;
            gameBoard.style.height = `${boardSizePx}px`;
            gameBoard.style.position = 'relative';
            gameBoard.style.background = 'var(--light-color)';
            gameBoard.style.border = '3px solid var(--dark-color)';
            gameBoard.style.borderRadius = 'var(--border-radius-lg)';
            gameBoard.style.margin = '0 auto';
            gameBoard.style.overflow = 'visible';
            gameBoard.style.touchAction = 'manipulation';
            gameBoard.style.boxShadow = 'var(--shadow-lg)';

            // 设置棋盘网格
            gameBoard.style.display = 'grid';
            gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
            gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
            gameBoard.style.gap = '0px';
            
            // 设置CSS变量
            document.documentElement.style.setProperty('--board-size', this.boardSize);
            document.documentElement.style.setProperty('--cell-size', `${boardSizePx / this.boardSize}px`);

            const fragment = document.createDocumentFragment();

            // 创建单元格
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    const cell = this.createCell(x, y, boardSizePx);
                    fragment.appendChild(cell);
                }
            }

            gameBoard.appendChild(fragment);
            this.drawWalls();
            this.updateTerritoriesDisplay();
            
            console.log('棋盘创建完成，尺寸:', boardSizePx, '移动端:', isMobile);
            
        } catch (error) {
            console.error('创建棋盘时出错:', error);
            this.showError('创建棋盘失败: ' + error.message);
        }
    }

    createCell(x, y, boardSizePx) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        
        // 设置单元格样式
        const cellStyle = {
            border: '1px solid var(--gray-color)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: '#ffffff',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            boxSizing: 'border-box'
        };

        // 应用样式
        Object.assign(cell.style, cellStyle);

        // 绑定事件
        this.bindCellEvents(cell, x, y);
        
        return cell;
    }

    bindCellEvents(cell, x, y) {
        // 移动端触摸事件
        if (this.isTouchDevice) {
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.touchStartTime = Date.now();
                this.lastTouch = { x, y };
                cell.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
            }, { passive: false });

            cell.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });

            cell.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const touchDuration = Date.now() - this.touchStartTime;
                cell.style.backgroundColor = '';
                
                // 防止长按误触，但允许正常的触摸
                if (touchDuration < 800) {
                    this.handleCellClick(x, y);
                }
            }, { passive: false });

            cell.addEventListener('touchcancel', (e) => {
                cell.style.backgroundColor = '';
            });
        }

        // 桌面端点击事件
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleCellClick(x, y);
        });

        // 鼠标悬停效果
        cell.addEventListener('mouseenter', () => {
            if (!this.isTouchDevice) {
                cell.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
            }
        });

        cell.addEventListener('mouseleave', () => {
            if (!this.isTouchDevice && !cell.classList.contains('selected') && 
                !cell.classList.contains('highlight')) {
                cell.style.backgroundColor = '';
            }
        });
    }

    isMobileDevice() {
        return this.isTouchDevice || window.innerWidth <= 768;
    }

    drawWalls() {
        console.log('开始绘制围墙...');
        
        try {
            // 清除现有围墙
            const existingWalls = document.querySelectorAll('.wall');
            existingWalls.forEach(wall => {
                if (wall.parentNode) {
                    wall.parentNode.removeChild(wall);
                }
            });

            const gameBoard = document.getElementById('game-board');
            if (!gameBoard) {
                console.error('找不到游戏棋盘');
                return;
            }

            const boardSizePx = parseInt(gameBoard.style.width);
            const cellSize = boardSizePx / this.boardSize;
            const fragment = document.createDocumentFragment();

            let wallCount = 0;

            // 绘制水平围墙
            for (let y = 0; y < this.horizontalWalls.length; y++) {
                for (let x = 0; x < this.horizontalWalls[y].length; x++) {
                    if (this.horizontalWalls[y][x]) {
                        const wall = this.createHorizontalWall(x, y, cellSize);
                        fragment.appendChild(wall);
                        wallCount++;
                    }
                }
            }

            // 绘制垂直围墙
            for (let x = 0; x < this.verticalWalls.length; x++) {
                for (let y = 0; y < this.verticalWalls[x].length; y++) {
                    if (this.verticalWalls[x][y]) {
                        const wall = this.createVerticalWall(x, y, cellSize);
                        fragment.appendChild(wall);
                        wallCount++;
                    }
                }
            }

            gameBoard.appendChild(fragment);
            console.log(`围墙绘制完成，共绘制了 ${wallCount} 个围墙`);
            
        } catch (error) {
            console.error('绘制围墙时出错:', error);
        }
    }

    createHorizontalWall(x, y, cellSize) {
        const wall = document.createElement('div');
        wall.className = 'wall horizontal';
        wall.style.cssText = `
            position: absolute;
            background: linear-gradient(135deg, var(--dark-color), var(--darker-color));
            width: ${cellSize}px;
            height: 8px;
            left: ${x * cellSize}px;
            top: ${y * cellSize - 4}px;
            z-index: 5;
            box-shadow: var(--shadow);
            border-radius: 2px;
            pointer-events: none;
        `;
        return wall;
    }

    createVerticalWall(x, y, cellSize) {
        const wall = document.createElement('div');
        wall.className = 'wall vertical';
        wall.style.cssText = `
            position: absolute;
            background: linear-gradient(135deg, var(--dark-color), var(--darker-color));
            width: 8px;
            height: ${cellSize}px;
            left: ${x * cellSize - 4}px;
            top: ${y * cellSize}px;
            z-index: 5;
            box-shadow: var(--shadow);
            border-radius: 2px;
            pointer-events: none;
        `;
        return wall;
    }

    handleCellClick(x, y) {
        if (this.gameOver) {
            this.showMessage('游戏已结束！');
            return;
        }
        
        if (this.isCurrentPlayerAI()) {
            this.showMessage('请等待AI思考...');
            return;
        }

        // 播放音效
        soundManager.play('click');

        try {
            if (this.phase === 'placement') {
                this.placePiece(x, y);
            } else if (this.phase === 'movement') {
                if (!this.selectedPiece) {
                    this.selectPiece(x, y);
                } else if (!this.hasMoved) {
                    this.movePiece(x, y);
                }
            }
        } catch (error) {
            console.error('处理单元格点击时出错:', error);
            this.showError('操作失败，请重试');
        }
    }

    placePiece(x, y) {
        const currentPlayer = this.players[this.currentPlayer];
        
        // 验证放置
        if (currentPlayer.pieces.length >= 4) {
            this.showMessage('您已经放置了所有棋子！');
            return;
        }
        
        if (this.cells[y][x] !== null) {
            this.showMessage('该位置已有棋子！');
            return;
        }

        console.log(`玩家 ${currentPlayer.name} 在 (${x}, ${y}) 放置棋子`);
        
        // 保存游戏状态
        this.saveGameState();
        
        // 更新游戏状态
        this.cells[y][x] = this.currentPlayer;
        currentPlayer.pieces.push({ x, y });

        // 更新UI
        this.updateCellPiece(x, y, currentPlayer);
        this.addGameLog(`${currentPlayer.name} 放置了棋子`);
        
        // 切换到下一个玩家
        this.switchToNextPlayer();
        this.checkPhaseTransition();
        this.updateUI();

        // 播放音效
        soundManager.play('move');

        // 检查AI移动
        if (this.isCurrentPlayerAI()) {
            setTimeout(() => this.makeAIMove(), 800);
        }
    }

    updateCellPiece(x, y, player) {
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (!cell) return;

        // 清除可能存在的旧棋子
        const existingPiece = cell.querySelector('.piece');
        if (existingPiece) {
            existingPiece.remove();
        }
        
        // 创建新棋子
        const piece = document.createElement('div');
        piece.className = `piece ${player.color}`;
        piece.style.cssText = `
            width: 70%;
            height: 70%;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--${player.color}-color), var(--${player.color}-dark));
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
            position: relative;
            z-index: 10;
            transition: all 0.3s ease;
        `;

        // 添加动画效果
        if (settingsManager.settings.animationsEnabled) {
            piece.style.transform = 'scale(0)';
            setTimeout(() => {
                piece.style.transform = 'scale(1)';
            }, 10);
        }

        cell.appendChild(piece);
    }

    selectPiece(x, y) {
        const cellOwner = this.cells[y][x];
        if (cellOwner !== this.currentPlayer) {
            return;
        }

        if (this.isPieceTrapped(x, y)) {
            this.showMessage('这个棋子已被困在领地内，无法移动！');
            return;
        }
        
        this.selectedPiece = { x, y };
        this.clearHighlights();
        
        // 高亮选中的棋子
        const selectedCell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (selectedCell) {
            selectedCell.classList.add('selected');
            if (settingsManager.settings.animationsEnabled) {
                selectedCell.style.animation = 'pulse 2s infinite';
            }
        }
        
        this.showValidMoves(x, y);
        soundManager.play('click');
    }

    movePiece(x, y) {
        if (!this.selectedPiece) return;

        const fromX = this.selectedPiece.x;
        const fromY = this.selectedPiece.y;

        if (!this.isValidMove(fromX, fromY, x, y)) {
            this.showMessage('无效的移动！');
            return;
        }

        console.log(`移动棋子从 (${fromX}, ${fromY}) 到 (${x}, ${y})`);
        
        // 保存游戏状态
        this.saveGameState();

        // 更新游戏状态
        this.cells[fromY][fromX] = null;
        this.cells[y][x] = this.currentPlayer;

        const currentPlayer = this.players[this.currentPlayer];
        const pieceObj = currentPlayer.pieces.find(p => p.x === fromX && p.y === fromY);
        if (pieceObj) {
            pieceObj.x = x;
            pieceObj.y = y;
        }

        // 更新UI
        this.movePieceOnBoard(fromX, fromY, x, y);
        this.hasMoved = true;
        this.clearHighlights();
        
        this.addGameLog(`${currentPlayer.name} 移动了棋子`);
        soundManager.play('move');

        // 显示围墙选项
        this.showWallOptions(x, y);
    }

    movePieceOnBoard(fromX, fromY, toX, toY) {
        const fromCell = document.querySelector(`.cell[data-x="${fromX}"][data-y="${fromY}"]`);
        const toCell = document.querySelector(`.cell[data-x="${toX}"][data-y="${toY}"]`);
        
        if (!fromCell || !toCell) return;

        const piece = fromCell.querySelector('.piece');
        if (!piece) return;

        // 添加移动动画
        if (settingsManager.settings.animationsEnabled) {
            const fromRect = fromCell.getBoundingClientRect();
            const toRect = toCell.getBoundingClientRect();
            const deltaX = toRect.left - fromRect.left;
            const deltaY = toRect.top - fromRect.top;

            piece.style.transition = 'none';
            piece.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            
            setTimeout(() => {
                piece.style.transition = 'all 0.3s ease';
                piece.style.transform = 'translate(0, 0)';
            }, 10);
        }

        // 移动棋子
        fromCell.removeChild(piece);
        toCell.appendChild(piece);

        // 重置单元格样式
        fromCell.classList.remove('selected');
        fromCell.style.animation = '';
    }

    showValidMoves(x, y) {
        const validMoves = this.getValidPieceMoves(x, y);
        
        validMoves.forEach(move => {
            const cell = document.querySelector(`.cell[data-x="${move.x}"][data-y="${move.y}"]`);
            if (cell) {
                cell.classList.add('highlight');
                if (settingsManager.settings.animationsEnabled) {
                    cell.style.animation = 'pulse 1.5s infinite';
                }
            }
        });
    }

    getValidPieceMoves(x, y) {
        const moves = [];
        const directions = [
            { dx: 0, dy: -1 }, // 上
            { dx: 0, dy: 1 },  // 下
            { dx: -1, dy: 0 }, // 左
            { dx: 1, dy: 0 }   // 右
        ];
        
        directions.forEach(dir => {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            if (this.isValidMove(x, y, newX, newY)) {
                moves.push({ x: newX, y: newY });
            }
        });
        
        return moves;
    }

    clearHighlights() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('highlight', 'selected');
            cell.style.animation = '';
            cell.style.backgroundColor = '';
        });
    }

    showWallOptions(x, y) {
        this.clearWallOptions();

        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const boardSizePx = parseInt(gameBoard.style.width);
        const cellSize = boardSizePx / this.boardSize;
        const fragment = document.createDocumentFragment();

        console.log(`在位置 (${x}, ${y}) 显示围墙选项`);

        const options = this.generateWallOptions(x, y, cellSize);
        let optionCount = 0;

        options.forEach(option => {
            if (this.canPlaceWall(option.wallX, option.wallY, option.orientation)) {
                const wallOption = this.createWallOptionElement(option, cellSize);
                fragment.appendChild(wallOption);
                this.wallOptions.push(wallOption);
                optionCount++;
            }
        });

        gameBoard.appendChild(fragment);
        console.log(`显示了 ${optionCount} 个围墙选项`);
        
        // 播放音效
        soundManager.play('click');
    }

    generateWallOptions(x, y, cellSize) {
        return [
            {
                number: 1,
                wallX: x,
                wallY: y,
                orientation: 'horizontal',
                left: x * cellSize + cellSize / 2 - 15,
                top: y * cellSize - 15,
                tooltip: '上方水平围墙'
            },
            {
                number: 2,
                wallX: x,
                wallY: y + 1,
                orientation: 'horizontal',
                left: x * cellSize + cellSize / 2 - 15,
                top: y * cellSize + cellSize - 15,
                tooltip: '下方水平围墙'
            },
            {
                number: 3,
                wallX: x,
                wallY: y,
                orientation: 'vertical',
                left: x * cellSize - 15,
                top: y * cellSize + cellSize / 2 - 15,
                tooltip: '左侧垂直围墙'
            },
            {
                number: 4,
                wallX: x + 1,
                wallY: y,
                orientation: 'vertical',
                left: x * cellSize + cellSize - 15,
                top: y * cellSize + cellSize / 2 - 15,
                tooltip: '右侧垂直围墙'
            }
        ];
    }

    createWallOptionElement(option, cellSize) {
        const wallOption = document.createElement('div');
        wallOption.className = 'wall-option';
        wallOption.innerHTML = `
            <span class="wall-option-number">${option.number}</span>
            <span class="wall-option-tooltip">${option.tooltip}</span>
        `;
        
        wallOption.style.cssText = `
            position: absolute;
            width: ${this.isTouchDevice ? '40px' : '30px'};
            height: ${this.isTouchDevice ? '40px' : '30px'};
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            border-radius: 50%;
            cursor: pointer;
            z-index: 25;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
            font-size: ${this.isTouchDevice ? '16px' : '14px'};
            box-shadow: var(--shadow-lg);
            transition: all 0.3s ease;
            border: 3px solid white;
            left: ${option.left}px;
            top: ${option.top}px;
            touch-action: manipulation;
        `;

        // 工具提示样式
        const tooltip = wallOption.querySelector('.wall-option-tooltip');
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 30;
        `;

        // 事件绑定
        this.bindWallOptionEvents(wallOption, option);

        return wallOption;
    }

    bindWallOptionEvents(wallOption, option) {
        // 鼠标悬停显示工具提示
        if (!this.isTouchDevice) {
            wallOption.addEventListener('mouseenter', () => {
                const tooltip = wallOption.querySelector('.wall-option-tooltip');
                tooltip.style.opacity = '1';
                wallOption.style.transform = 'scale(1.2)';
                wallOption.style.background = 'linear-gradient(135deg, var(--primary-dark), #1f618d)';
            });

            wallOption.addEventListener('mouseleave', () => {
                const tooltip = wallOption.querySelector('.wall-option-tooltip');
                tooltip.style.opacity = '0';
                wallOption.style.transform = 'scale(1)';
                wallOption.style.background = 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))';
            });
        }

        // 点击事件
        const clickHandler = (e) => {
            e.stopPropagation();
            console.log(`选择围墙选项 ${option.number}`);
            soundManager.play('click');
            this.placeWall(option.wallX, option.wallY, option.orientation);
        };

        // 移动端触摸事件
        if (this.isTouchDevice) {
            wallOption.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                wallOption.style.transform = 'scale(1.1)';
            }, { passive: true });

            wallOption.addEventListener('touchend', (e) => {
                e.stopPropagation();
                wallOption.style.transform = 'scale(1)';
                clickHandler(e);
            }, { passive: true });
        }

        // 桌面端点击事件
        wallOption.addEventListener('click', clickHandler);
    }

    clearWallOptions() {
        this.wallOptions.forEach(option => {
            if (option.parentNode) {
                option.parentNode.removeChild(option);
            }
        });
        this.wallOptions = [];
    }

    placeWall(x, y, orientation) {
        console.log(`放置围墙: (${x}, ${y}), 方向: ${orientation}`);
        
        const currentPlayer = this.players[this.currentPlayer];
        
        // 检查围墙数量
        if (currentPlayer.walls <= 0 && this.config.maxWalls !== 999) {
            this.showMessage('围墙数量不足！');
            soundManager.play('error');
            return;
        }

        // 检查是否可以放置围墙
        if (!this.canPlaceWall(x, y, orientation)) {
            this.showMessage('这里不能放置围墙！');
            soundManager.play('error');
            return;
        }

        // 保存游戏状态
        this.saveGameState();

        // 放置围墙
        if (orientation === 'horizontal') {
            this.horizontalWalls[y][x] = true;
            console.log(`设置水平围墙[${y}][${x}] = true`);
        } else {
            this.verticalWalls[x][y] = true;
            console.log(`设置垂直围墙[${x}][${y}] = true`);
        }

        // 减少围墙数量
        if (this.config.maxWalls !== 999) {
            currentPlayer.walls--;
        }

        // 更新UI
        this.drawWalls();
        this.clearWallOptions();
        
        this.addGameLog(`${currentPlayer.name} 放置了围墙`);
        soundManager.play('wall');

        // 检测领地
        this.detectTerritories();

        this.selectedPiece = null;
        this.hasMoved = false;

        this.switchToNextPlayer();
        this.updateUI();

        // 检查游戏结束
        this.checkGameEnd();

        // 检查AI移动
        if (this.isCurrentPlayerAI()) {
            setTimeout(() => this.makeAIMove(), 800);
        }
    }

    canPlaceWall(x, y, orientation) {
        if (orientation === 'horizontal') {
            if (y <= 0 || y >= this.horizontalWalls.length) return false;
            if (x < 0 || x >= this.horizontalWalls[y].length) return false;
            return !this.horizontalWalls[y][x];
        } else {
            if (x <= 0 || x >= this.verticalWalls.length) return false;
            if (y < 0 || y >= this.verticalWalls[x].length) return false;
            return !this.verticalWalls[x][y];
        }
    }

    // 检测领地
    detectTerritories() {
        console.log('开始检测领地...');
        
        // 重置领地状态
        this.territories = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        
        // 重置玩家分数和领地信息
        this.players.forEach(player => {
            player.score = 0;
            player.territories = [];
        });
        
        const visited = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(false));
        let territoryId = 0;
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (!visited[y][x]) {
                    const region = this.bfsRegion(x, y, visited);
                    territoryId++;
                    
                    if (this.isRegionEnclosed(region)) {
                        const owner = this.getRegionOwner(region);
                        
                        if (owner !== null) {
                            // 标记领地
                            region.forEach(cell => {
                                this.territories[cell.y][cell.x] = owner;
                            });
                            
                            // 更新分数
                            this.players[owner].score += region.length;
                            
                            // 记录领地信息
                            this.players[owner].territories.push({
                                id: territoryId,
                                cells: region,
                                size: region.length
                            });
                            
                            console.log(`玩家 ${this.players[owner].name} 获得领地，大小: ${region.length}, 新得分: ${this.players[owner].score}`);
                            
                            // 播放得分音效
                            if (region.length >= 5) {
                                soundManager.play('win');
                            }
                        }
                    }
                }
            }
        }
        
        this.updateTerritoriesDisplay();
        this.updateUI();
    }

    bfsRegion(startX, startY, visited) {
        const region = [];
        const queue = [{x: startX, y: startY}];
        visited[startY][startX] = true;
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            region.push({x, y});
            
            const directions = [
                {dx: 0, dy: -1}, // 上
                {dx: 0, dy: 1},  // 下
                {dx: -1, dy: 0}, // 左
                {dx: 1, dy: 0}   // 右
            ];
            
            for (const dir of directions) {
                const newX = x + dir.dx;
                const newY = y + dir.dy;
                
                if (newX >= 0 && newX < this.boardSize && 
                    newY >= 0 && newY < this.boardSize && 
                    !visited[newY][newX] &&
                    !this.isWallBetween(x, y, newX, newY)) {
                    visited[newY][newX] = true;
                    queue.push({x: newX, y: newY});
                }
            }
        }
        
        return region;
    }

    isWallBetween(x1, y1, x2, y2) {
        if (x1 === x2) {
            // 垂直移动 - 检查水平围墙
            const wallY = Math.min(y1, y2) + 1;
            return this.horizontalWalls[wallY] && this.horizontalWalls[wallY][x1];
        } else {
            // 水平移动 - 检查垂直围墙
            const wallX = Math.min(x1, x2) + 1;
            return this.verticalWalls[wallX] && this.verticalWalls[wallX][y1];
        }
    }

    isRegionEnclosed(region) {
        for (const cell of region) {
            const {x, y} = cell;
            
            const directions = [
                {dx: 0, dy: -1}, // 上
                {dx: 0, dy: 1},  // 下
                {dx: -1, dy: 0}, // 左
                {dx: 1, dy: 0}   // 右
            ];
            
            for (const dir of directions) {
                const newX = x + dir.dx;
                const newY = y + dir.dy;
                
                // 如果相邻格子在棋盘外，说明有边界围墙
                if (newX < 0 || newX >= this.boardSize || 
                    newY < 0 || newY >= this.boardSize) {
                    continue;
                }
                
                // 如果相邻格子不在区域内且没有围墙阻挡，说明区域未完全包围
                if (!region.some(c => c.x === newX && c.y === newY) && 
                    !this.isWallBetween(x, y, newX, newY)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    getRegionOwner(region) {
        let playerPieces = Array(this.players.length).fill(0);
        
        for (const cell of region) {
            const {x, y} = cell;
            const cellOwner = this.cells[y][x];
            
            if (cellOwner !== null) {
                playerPieces[cellOwner]++;
            }
        }
        
        // 找出有棋子的玩家
        const playersWithPieces = playerPieces
            .map((count, playerId) => ({ playerId, count }))
            .filter(item => item.count > 0);
        
        // 如果区域内只有一种颜色的棋子，返回该玩家
        if (playersWithPieces.length === 1) {
            return playersWithPieces[0].playerId;
        }
        
        // 如果区域内有多种颜色的棋子或没有棋子，返回null
        return null;
    }

    updateTerritoriesDisplay() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            const territoryOwner = this.territories[y][x];
            
            // 移除所有领地类
            cell.classList.remove('territory-player1', 'territory-player2', 'territory-player3', 'territory-player4');
            
            // 添加对应的领地类
            if (territoryOwner !== null) {
                cell.classList.add(`territory-${this.players[territoryOwner].color}`);
                
                // 添加动画效果
                if (settingsManager.settings.animationsEnabled) {
                    cell.style.animation = 'pulse 0.5s ease';
                    setTimeout(() => {
                        cell.style.animation = '';
                    }, 500);
                }
            }
        });
    }

    // 检查棋子是否被困在领地内
    isPieceTrapped(x, y) {
        return this.territories[y][x] !== null;
    }

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
            if (dx === 1) {
                const wallX = Math.min(fromX, toX) + 1;
                const wallY = fromY;
                if (this.verticalWalls[wallX] && this.verticalWalls[wallX][wallY]) {
                    return false;
                }
            } else {
                const wallX = fromX;
                const wallY = Math.min(fromY, toY) + 1;
                if (this.horizontalWalls[wallY] && this.horizontalWalls[wallY][wallX]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    switchToNextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.hasMoved = false;
        this.selectedPiece = null;
        this.turnCount++;
        this.clearHighlights();
        this.clearWallOptions();
        console.log(`切换到玩家 ${this.currentPlayer}`);
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
            soundManager.play('confirm');
        }
    }

    checkGameEnd() {
        // 检查是否所有玩家都无法移动
        let canAnyPlayerMove = false;
        
        for (const player of this.players) {
            for (const piece of player.pieces) {
                if (!this.isPieceTrapped(piece.x, piece.y)) {
                    const validMoves = this.getValidPieceMoves(piece.x, piece.y);
                    if (validMoves.length > 0) {
                        canAnyPlayerMove = true;
                        break;
                    }
                }
            }
            if (canAnyPlayerMove) break;
        }
        
        if (!canAnyPlayerMove) {
            this.gameOver = true;
            this.endGame();
        }
    }

    endGame() {
        console.log('游戏结束！');
        
        // 确定获胜者
        let maxScore = -1;
        let winners = [];
        
        this.players.forEach(player => {
            if (player.score > maxScore) {
                maxScore = player.score;
                winners = [player];
            } else if (player.score === maxScore) {
                winners.push(player);
            }
        });
        
        // 更新游戏统计
        this.updateGameStatistics(winners);
        
        // 显示游戏结束弹窗
        this.showGameOverModal(winners, maxScore);
        this.addGameLog('游戏结束！');
        
        // 播放游戏结束音效
        soundManager.play('win');
    }

    updateGameStatistics(winners) {
        // 更新游戏次数
        settingsManager.incrementStat('gamesPlayed');
        
        // 更新游戏时间
        const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
        settingsManager.incrementStat('totalPlayTime', gameDuration);
        
        // 更新获胜次数
        if (winners.some(winner => winner.type === 'human')) {
            settingsManager.incrementStat('gamesWon');
        }
        
        // 更新最高得分
        const maxScore = Math.max(...this.players.map(player => player.score));
        if (maxScore > settingsManager.settings.bestScore) {
            settingsManager.updateSetting('bestScore', maxScore);
        }
    }

    // AI相关方法
    async makeAIMove() {
        console.log('AI开始思考...');
        const aiPlayer = this.aiPlayers.get(this.currentPlayer);
        if (!aiPlayer) {
            console.log('找不到AI玩家，跳过回合');
            this.switchToNextPlayer();
            return;
        }

        try {
            // 显示AI思考指示器
            aiPlayer.showThinkingIndicator();
            
            // 等待AI思考时间
            await Utils.wait(aiPlayer.getThinkingTime());

            const gameState = {
                boardSize: this.boardSize,
                cells: this.cells,
                horizontalWalls: this.horizontalWalls,
                verticalWalls: this.verticalWalls,
                players: this.players,
                phase: this.phase,
                currentPlayer: this.currentPlayer,
                territories: this.territories
            };

            const move = await aiPlayer.makeMove(gameState);
            
            if (move) {
                console.log('AI决定移动:', move);
                
                if (move.type === 'placement') {
                    // AI放置棋子
                    this.placePiece(move.x, move.y);
                } else if (move.type === 'movement') {
                    // AI移动棋子
                    this.selectPieceForAI(move.fromX, move.fromY);
                    await Utils.wait(800);
                    this.movePieceForAI(move.toX, move.toY);
                    
                    // AI放置围墙
                    await Utils.wait(800);
                    const wallOptions = aiPlayer.getWallOptionsForAI(gameState, move.toX, move.toY);
                    const bestWall = aiPlayer.chooseBestWallOption(wallOptions);
                    
                    if (bestWall) {
                        console.log('AI选择围墙:', bestWall);
                        this.placeWall(bestWall.wallX, bestWall.wallY, bestWall.orientation);
                    } else {
                        console.log('AI没有选择围墙，跳过');
                        this.switchToNextPlayer();
                        this.updateUI();
                    }
                }
            } else {
                console.log('AI没有有效移动，跳过回合');
                this.switchToNextPlayer();
                this.updateUI();
            }
        } catch (error) {
            console.error('AI移动出错:', error);
            this.switchToNextPlayer();
            this.updateUI();
        } finally {
            // 隐藏AI思考指示器
            aiPlayer.hideThinkingIndicator();
        }
    }

    selectPieceForAI(x, y) {
        console.log(`AI选择棋子: (${x}, ${y})`);
        this.selectedPiece = { x, y };
        this.clearHighlights();
        
        const selectedCell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (selectedCell) {
            selectedCell.style.backgroundColor = 'rgba(241, 196, 15, 0.3)';
        }
    }

    movePieceForAI(x, y) {
        if (!this.selectedPiece) return;

        const fromX = this.selectedPiece.x;
        const fromY = this.selectedPiece.y;

        console.log(`AI移动棋子从 (${fromX}, ${fromY}) 到 (${x}, ${y})`);
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
    }

    isCurrentPlayerAI() {
        const currentPlayer = this.players[this.currentPlayer];
        return currentPlayer.type.startsWith('ai-');
    }

    // 事件绑定
    bindEvents() {
        console.log('开始绑定事件...');
        this.bindButtonEvents();
        this.bindModalEvents();
        this.bindGlobalEvents();
    }

    bindButtonEvents() {
        const buttonConfigs = [
            { id: 'menu-btn', method: 'showPauseMenu' },
            { id: 'restart-btn', method: 'restartGame' },
            { id: 'undo-btn', method: 'undoMove' },
            { id: 'change-piece-btn', method: 'changePiece' },
            { id: 'pass-turn-btn', method: 'passTurn' },
            { id: 'pause-btn', method: 'showPauseMenu' },
            { id: 'hint-btn', method: 'showHints' }
        ];

        buttonConfigs.forEach(config => {
            const button = document.getElementById(config.id);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('click');
                    this[config.method]();
                });
            } else {
                console.warn(`找不到按钮: ${config.id}`);
            }
        });
    }

    bindModalEvents() {
        const modalConfigs = [
            { id: 'resume-btn', method: 'hidePauseMenu' },
            { id: 'restart-modal-btn', method: 'restartGame' },
            { id: 'menu-modal-btn', method: 'returnToMenu' },
            { id: 'settings-modal-btn', method: 'showSettings' },
            { id: 'play-again-btn', method: 'restartGame' },
            { id: 'back-to-menu-btn', method: 'returnToMenu' },
            { id: 'review-game-btn', method: 'reviewGame' }
        ];

        modalConfigs.forEach(config => {
            const button = document.getElementById(config.id);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    soundManager.play('click');
                    this[config.method]();
                });
            }
        });

        // 模态框外部点击关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    soundManager.play('click');
                    modal.classList.remove('show');
                }
            });
        });
    }

    bindGlobalEvents() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.currentModal) {
                    this.hidePauseMenu();
                } else {
                    this.showPauseMenu();
                }
            }
            
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.restartGame();
            }
            
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undoMove();
            }
        });

        // 窗口大小变化
        window.addEventListener('resize', Utils.debounce(() => {
            if (this.isMobileDevice()) {
                this.recreateBoard();
            }
        }, 250));
    }

    // UI更新
    updateUI() {
        console.log('更新UI');
        
        try {
            // 更新玩家信息
            this.players.forEach((player, index) => {
                this.updatePlayerUI(player, index);
            });

            // 更新阶段显示
            this.updatePhaseUI();
            
            // 更新回合显示
            this.updateTurnUI();
            
            // 更新控制按钮状态
            this.updateControlButtons();
            
            // 更新游戏状态
            this.updateGameStatus();
            
        } catch (error) {
            console.error('更新UI时出错:', error);
        }
    }

    updatePlayerUI(player, index) {
        const piecesElement = document.getElementById(`player${index + 1}-pieces`);
        const wallsElement = document.getElementById(`player${index + 1}-walls`);
        const scoreElement = document.getElementById(`player${index + 1}-score`);
        const playerInfo = document.getElementById(`player${index + 1}-info`);
        
        if (piecesElement) {
            piecesElement.textContent = `${player.pieces.length}/4`;
            piecesElement.title = `已放置 ${player.pieces.length} 个棋子`;
        }
        
        if (wallsElement) {
            wallsElement.textContent = this.config.maxWalls === 999 ? '∞' : player.walls;
            wallsElement.title = `剩余围墙数量: ${this.config.maxWalls === 999 ? '无限' : player.walls}`;
        }
        
        if (scoreElement) {
            scoreElement.textContent = player.score;
            scoreElement.title = `当前得分: ${player.score}`;
            
            // 得分变化动画
            if (settingsManager.settings.animationsEnabled) {
                scoreElement.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    scoreElement.style.transform = 'scale(1)';
                }, 300);
            }
        }
        
        if (playerInfo) {
            playerInfo.classList.toggle('active', index === this.currentPlayer);
            playerInfo.classList.toggle('hidden', index >= this.players.length);
            
            // 更新玩家类型显示
            const typeElement = playerInfo.querySelector('.player-type');
            if (typeElement) {
                if (player.type.startsWith('ai-')) {
                    const difficulty = player.type.split('-')[1];
                    typeElement.textContent = `AI - ${this.getDifficultyText(difficulty)}`;
                    typeElement.title = `AI难度: ${this.getDifficultyText(difficulty)}`;
                } else {
                    typeElement.textContent = '人类';
                    typeElement.title = '人类玩家';
                }
            }
        }
    }

    getDifficultyText(difficulty) {
        const difficultyMap = {
            'easy': '简单',
            'medium': '中等',
            'hard': '困难'
        };
        return difficultyMap[difficulty] || difficulty;
    }

    updatePhaseUI() {
        const phaseIndicator = document.getElementById('phase-indicator');
        const phaseText = document.querySelector('.phase-text');
        
        if (phaseIndicator && phaseText) {
            const phaseIcon = phaseIndicator.querySelector('.phase-icon');
            if (this.phase === 'placement') {
                phaseIcon.textContent = '🎯';
                phaseText.textContent = '放置阶段';
                phaseText.title = '轮流放置4个棋子';
            } else {
                phaseIcon.textContent = '🚶';
                phaseText.textContent = '移动阶段';
                phaseText.title = '移动棋子并放置围墙';
            }
        }
    }

    updateTurnUI() {
        const turnText = document.querySelector('.turn-text');
        const turnCount = document.getElementById('turn-count');
        const turnTimer = document.getElementById('timer-value');
        
        if (turnText) {
            turnText.textContent = `${this.players[this.currentPlayer].name}的回合`;
            turnText.title = `当前玩家: ${this.players[this.currentPlayer].name}`;
        }
        
        if (turnCount) {
            turnCount.textContent = this.turnCount;
            turnCount.title = `当前回合数: ${this.turnCount}`;
        }
        
        if (turnTimer) {
            const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
            turnTimer.textContent = Utils.formatTime(gameDuration);
        }
    }

    updateControlButtons() {
        const changePieceBtn = document.getElementById('change-piece-btn');
        const undoBtn = document.getElementById('undo-btn');
        const hintBtn = document.getElementById('hint-btn');
        const passTurnBtn = document.getElementById('pass-turn-btn');
        
        if (changePieceBtn) {
            changePieceBtn.disabled = this.phase !== 'movement' || this.hasMoved || this.selectedPiece === null;
            changePieceBtn.title = this.phase !== 'movement' ? '仅在移动阶段可用' : 
                                 this.hasMoved ? '已移动，无法更换棋子' : 
                                 this.selectedPiece === null ? '请先选择棋子' : '更换当前选择的棋子';
        }
        
        if (undoBtn) {
            undoBtn.disabled = this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI();
            undoBtn.title = this.history.length < 2 ? '没有可悔棋的步骤' : 
                           !this.config.allowUndo ? '悔棋功能已禁用' : 
                           this.isCurrentPlayerAI() ? 'AI回合无法悔棋' : '撤销上一步操作';
        }
        
        if (hintBtn) {
            hintBtn.disabled = this.gameOver || this.isCurrentPlayerAI();
            hintBtn.title = this.gameOver ? '游戏已结束' : 
                           this.isCurrentPlayerAI() ? 'AI回合无法提示' : '显示游戏提示';
        }
        
        if (passTurnBtn) {
            passTurnBtn.disabled = this.phase !== 'movement' || this.hasMoved || this.isCurrentPlayerAI();
            passTurnBtn.title = this.phase !== 'movement' ? '仅在移动阶段可用' : 
                               this.hasMoved ? '已移动，无法跳过' : 
                               this.isCurrentPlayerAI() ? 'AI回合无法跳过' : '跳过当前回合';
        }
    }

    updateGameStatus() {
        const gameStatus = document.getElementById('game-status');
        const currentAction = document.getElementById('current-action');
        
        if (gameStatus) {
            gameStatus.textContent = this.gameOver ? '游戏结束' : '游戏进行中...';
            gameStatus.title = this.gameOver ? '游戏已结束，查看结果' : '游戏正在进行中';
        }
        
        if (currentAction) {
            if (this.gameOver) {
                currentAction.textContent = '游戏结束，查看结果';
            } else if (this.phase === 'placement') {
                currentAction.textContent = '请放置你的棋子';
            } else if (this.selectedPiece) {
                currentAction.textContent = '请选择移动位置或放置围墙';
            } else {
                currentAction.textContent = '请选择要移动的棋子';
            }
        }
    }

    // 游戏控制方法
    saveGameState() {
        const gameState = {
            cells: Utils.deepClone(this.cells),
            horizontalWalls: Utils.deepClone(this.horizontalWalls),
            verticalWalls: Utils.deepClone(this.verticalWalls),
            players: Utils.deepClone(this.players),
            currentPlayer: this.currentPlayer,
            phase: this.phase,
            territories: Utils.deepClone(this.territories),
            selectedPiece: this.selectedPiece,
            hasMoved: this.hasMoved,
            turnCount: this.turnCount,
            timestamp: Date.now()
        };
        
        this.history.push(gameState);
        
        // 限制历史记录数量
        if (this.history.length > this.config.maxUndoSteps + 1) {
            this.history.shift();
        }
        
        this.updateUndoButton();
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.disabled = this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI();
        }
    }

    undoMove() {
        console.log('执行悔棋操作');
        
        if (this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI()) {
            this.showMessage('无法悔棋！');
            return;
        }

        try {
            // 弹出当前状态
            this.history.pop();
            
            // 恢复到上一个状态
            const previousState = this.history[this.history.length - 1];
            this.restoreGameState(previousState);
            
            this.addGameLog('撤销了上一步操作');
            soundManager.play('click');
            
        } catch (error) {
            console.error('悔棋时出错:', error);
            this.showError('悔棋失败，请重试');
        }
    }

    restoreGameState(state) {
        this.cells = state.cells;
        this.horizontalWalls = state.horizontalWalls;
        this.verticalWalls = state.verticalWalls;
        this.players = state.players;
        this.currentPlayer = state.currentPlayer;
        this.phase = state.phase;
        this.territories = state.territories;
        this.selectedPiece = state.selectedPiece;
        this.hasMoved = state.hasMoved;
        this.turnCount = state.turnCount;
        
        this.recreateBoard();
        this.updateUI();
    }

    recreateBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;
        
        gameBoard.innerHTML = '';
        this.createBoard();
    }

    changePiece() {
        console.log('更换选择的棋子');
        this.selectedPiece = null;
        this.clearHighlights();
        soundManager.play('click');
        this.addGameLog(`${this.players[this.currentPlayer].name} 更换了选择的棋子`);
    }

    passTurn() {
        console.log('跳过当前回合');
        this.saveGameState();
        this.switchToNextPlayer();
        this.updateUI();
        soundManager.play('click');
        this.addGameLog(`${this.players[(this.currentPlayer + this.players.length - 1) % this.players.length].name} 跳过了回合`);
    }

    showPauseMenu() {
        console.log('显示暂停菜单');
        const modal = document.getElementById('pause-modal');
        if (modal) {
            modal.classList.add('show');
            this.currentModal = modal;
        }
    }

    hidePauseMenu() {
        console.log('隐藏暂停菜单');
        const modal = document.getElementById('pause-modal');
        if (modal) {
            modal.classList.remove('show');
            this.currentModal = null;
        }
    }

    restartGame() {
        console.log('重新开始游戏');
        if (confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
            soundManager.play('confirm');
            window.location.reload();
        }
    }

    returnToMenu() {
        console.log('返回主菜单');
        if (confirm('确定要返回主菜单吗？当前游戏进度将丢失。')) {
            soundManager.play('confirm');
            window.location.href = 'index.html';
        }
    }

    showSettings() {
        console.log('显示设置');
        alert('游戏设置功能将在后续版本中添加。\n\n当前设置：\n- 音效: ' + (settingsManager.settings.soundEnabled ? '开启' : '关闭') + '\n- 动画: ' + (settingsManager.settings.animationsEnabled ? '开启' : '关闭') + '\n- 悔棋: ' + (settingsManager.settings.allowUndo ? '允许' : '禁止'));
    }

    showHints() {
        console.log('显示游戏提示');
        
        if (!this.config.showHints) {
            this.showMessage('提示功能已禁用，请在设置中启用提示功能');
            return;
        }

        let hint = '';
        
        if (this.phase === 'placement') {
            hint = '💡 放置阶段提示：\n\n' +
                   '• 尽量将棋子放置在棋盘中央区域\n' +
                   '• 分散放置棋子以控制更多区域\n' +
                   '• 考虑后续移动和围墙放置的位置';
        } else {
            hint = '💡 移动阶段提示：\n\n' +
                   '• 移动棋子来创造有利的围墙放置位置\n' +
                   '• 优先围住有自己棋子的区域\n' +
                   '• 注意不要被困住自己的棋子\n' +
                   '• 观察对手的移动模式';
        }
        
        this.showMessage(hint);
        soundManager.play('click');
    }

    reviewGame() {
        console.log('回顾游戏');
        this.showMessage('游戏回顾功能将在后续版本中添加。\n\n当前游戏信息：\n- 回合数: ' + this.turnCount + '\n- 游戏时长: ' + Utils.formatTime(Math.floor((Date.now() - this.gameStartTime) / 1000)) + '\n- 玩家数量: ' + this.players.length);
    }

    showGameOverModal(winners, winningScore) {
        const modal = document.getElementById('game-over-modal');
        const resultSummary = document.getElementById('result-summary');
        const winnerCelebration = document.getElementById('winner-celebration');
        const scoreBoard = document.getElementById('final-score-board');
        
        if (!modal) return;
        
        // 更新结果摘要
        if (winners.length === 1) {
            resultSummary.innerHTML = `
                <h3>🎉 游戏结束！</h3>
                <p><strong>${winners[0].name}</strong> 获胜！</p>
                <p>最终得分: <strong>${winningScore}</strong></p>
                <p>游戏时长: ${Utils.formatTime(Math.floor((Date.now() - this.gameStartTime) / 1000))}</p>
            `;
        } else {
            const winnerNames = winners.map(w => w.name).join('、');
            resultSummary.innerHTML = `
                <h3>🎉 游戏结束！</h3>
                <p><strong>平局！</strong> ${winnerNames} 共同获胜！</p>
                <p>最终得分: <strong>${winningScore}</strong></p>
                <p>游戏时长: ${Utils.formatTime(Math.floor((Date.now() - this.gameStartTime) / 1000))}</p>
            `;
        }
        
        // 更新获胜者庆祝
        if (winnerCelebration) {
            if (winners.length === 1) {
                winnerCelebration.innerHTML = `
                    <h3>🏆 恭喜获胜！</h3>
                    <p>${winners[0].name} 展现了出色的策略！</p>
                    <div class="celebration-animation">🎊 🎉 🎊</div>
                `;
            } else {
                winnerCelebration.innerHTML = `
                    <h3>🏆 精彩的平局！</h3>
                    <p>所有获胜者都表现出色！</p>
                    <div class="celebration-animation">🎊 🎉 🎊</div>
                `;
            }
        }
        
        // 更新得分板
        if (scoreBoard) {
            scoreBoard.innerHTML = '';
            this.players
                .sort((a, b) => b.score - a.score)
                .forEach((player, index) => {
                    const isWinner = winners.some(winner => winner.id === player.id);
                    const scoreItem = document.createElement('div');
                    scoreItem.className = `score-item ${isWinner ? 'winner' : ''}`;
                    scoreItem.innerHTML = `
                        <div class="score-player">
                            <div class="score-player-color" style="background: var(--${player.color}-color)"></div>
                            <span class="score-player-name">${player.name}</span>
                            <span class="score-player-type">${player.type.startsWith('ai-') ? 'AI' : '玩家'}</span>
                        </div>
                        <div class="score-value">${player.score}</div>
                        ${isWinner ? '<div class="winner-crown">👑</div>' : ''}
                    `;
                    scoreBoard.appendChild(scoreItem);
                });
        }
        
        modal.classList.add('show');
        this.currentModal = modal;
    }

    addGameLog(message) {
        const logContent = document.getElementById('game-log');
        if (!logContent) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timestamp = Utils.formatTime(Math.floor((Date.now() - this.gameStartTime) / 1000));
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
        
        // 限制日志数量
        const logEntries = logContent.querySelectorAll('.log-entry');
        if (logEntries.length > 50) {
            logEntries[0].remove();
        }
    }

    showMessage(message) {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = 'game-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: var(--border-radius-lg);
            z-index: 10000;
            font-size: 16px;
            text-align: center;
            max-width: 80%;
            box-shadow: var(--shadow-xl);
            border: 2px solid var(--primary-color);
            white-space: pre-line;
            line-height: 1.5;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // 自动消失
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 4000);
    }

    showError(message) {
        console.error('游戏错误:', message);
        this.showMessage('❌ ' + message);
    }
}

// 添加游戏样式
const gameStyles = `
/* 领地样式 */
.cell.territory-player1 { 
    background-color: rgba(255, 107, 107, 0.15) !important; 
    border-color: rgba(255, 107, 107, 0.3) !important;
}
.cell.territory-player2 { 
    background-color: rgba(78, 205, 196, 0.15) !important;
    border-color: rgba(78, 205, 196, 0.3) !important;
}
.cell.territory-player3 { 
    background-color: rgba(255, 234, 167, 0.15) !important;
    border-color: rgba(255, 234, 167, 0.3) !important;
}
.cell.territory-player4 { 
    background-color: rgba(162, 155, 254, 0.15) !important;
    border-color: rgba(162, 155, 254, 0.3) !important;
}

/* 围墙选项工具提示 */
.wall-option-tooltip {
    display: none;
}

.wall-option:hover .wall-option-tooltip {
    display: block;
}

/* 游戏消息样式 */
.game-message {
    animation: fadeIn 0.3s ease;
}

/* 移动端优化 */
@media (max-width: 768px) {
    .game-board {
        width: 95vw !important;
        max-width: 500px;
        height: 95vw !important;
        max-height: 500px;
    }
    
    .wall-option {
        width: 44px !important;
        height: 44px !important;
        font-size: 18px !important;
    }
    
    .header-btn, .control-btn {
        padding: 14px 18px !important;
        font-size: 14px !important;
        margin: 2px;
    }
    
    .player-info {
        padding: 12px !important;
        margin-bottom: 8px;
    }
    
    .player-stats {
        grid-template-columns: 1fr !important;
        gap: 4px;
    }
    
    .game-main {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
        padding: 12px !important;
    }
    
    .info-section {
        order: -1;
    }
}

/* 防止移动端缩放 */
@media (max-width: 768px) {
    .game-container {
        -webkit-text-size-adjust: 100%;
        touch-action: manipulation;
    }
    
    .game-header {
        padding: 12px 16px !important;
        flex-wrap: wrap;
    }
    
    .header-center {
        order: -1;
        flex-basis: 100%;
        margin-bottom: 8px;
    }
}

/* 小屏幕手机优化 */
@media (max-width: 480px) {
    .game-board {
        width: 92vw !important;
        height: 92vw !important;
    }
    
    .header-btn, .control-btn {
        padding: 12px 14px !important;
        font-size: 12px !important;
    }
    
    .player-info {
        padding: 8px !important;
    }
    
    .player-name {
        font-size: 14px !important;
    }
    
    .stat-value {
        font-size: 16px !important;
    }
}

/* 日志样式优化 */
.log-entry {
    padding: 8px 12px;
    margin-bottom: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border-left: 3px solid var(--primary-color);
    font-size: 13px;
    line-height: 1.4;
}

.log-time {
    color: var(--gray-color);
    font-size: 11px;
    margin-right: 8px;
}

.log-message {
    color: var(--light-color);
}

/* 得分板样式 */
.score-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--border-radius);
    margin-bottom: 8px;
    border-left: 4px solid transparent;
    transition: all 0.3s ease;
}

.score-item.winner {
    background: rgba(255, 215, 0, 0.1);
    border-left-color: gold;
    transform: scale(1.02);
}

.score-player {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.score-player-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.score-player-name {
    font-weight: 600;
    color: var(--light-color);
    flex: 1;
}

.score-player-type {
    font-size: 12px;
    color: var(--gray-color);
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 12px;
}

.score-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--light-color);
    margin-right: 8px;
}

.winner-crown {
    font-size: 1.2rem;
    animation: bounce 1s infinite;
}

/* 庆祝动画 */
.celebration-animation {
    font-size: 1.5rem;
    margin-top: 10px;
    animation: pulse 1.5s infinite;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -60%); }
    to { opacity: 1; transform: translate(-50%, -50%); }
}

@keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0, 0, 0);
    }
    40%, 43% {
        transform: translate3d(0, -8px, 0);
    }
    70% {
        transform: translate3d(0, -4px, 0);
    }
}
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = gameStyles;
document.head.appendChild(styleSheet);

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== 游戏页面加载完成 ===');
    
    // 检查必要元素
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
            console.log('🎮 游戏初始化成功！');
        } catch (error) {
            console.error('❌ 游戏初始化失败:', error);
            alert('游戏初始化失败，请刷新页面重试。错误信息: ' + error.message);
        }
    } else {
        console.error('❌ 没有找到游戏配置');
        alert('没有找到游戏配置，返回主菜单');
        window.location.href = 'index.html';
    }
});

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
        this.territories = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        
        // UI状态
        this.selectedPiece = null;
        this.hasMoved = false;
        this.wallOptions = [];
        this.touchStartTime = 0;
        this.lastTouch = { x: 0, y: 0 };
        
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
            score: 0,
            surrendered: false
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
        console.log('玩家配置:', this.players);
        
        this.createBoard();
        this.bindEvents();
        this.updateUI();
        this.addGameLog('游戏开始！');
        
        // 保存初始状态
        this.saveGameState();
        
        // 如果第一个玩家是AI，自动开始
        if (this.isCurrentPlayerAI()) {
            console.log('第一个玩家是AI，开始AI移动');
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
        const boardSizePx = 500;
        gameBoard.style.width = `${boardSizePx}px`;
        gameBoard.style.height = `${boardSizePx}px`;
        gameBoard.style.position = 'relative';
        gameBoard.style.background = '#ffffff';
        gameBoard.style.border = '3px solid #2c3e50';
        gameBoard.style.borderRadius = '8px';
        gameBoard.style.margin = '0 auto';
        gameBoard.style.overflow = 'visible';
        gameBoard.style.touchAction = 'manipulation';

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
                cell.style.border = '1px solid #bdc3c7';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.position = 'relative';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.15s ease';
                cell.style.backgroundColor = '#ffffff';
                cell.style.userSelect = 'none';
                cell.style.webkitUserSelect = 'none';
                cell.style.webkitTapHighlightColor = 'transparent';
                
                // 如果有棋子，创建棋子
                if (this.cells[y][x] !== null) {
                    const playerId = this.cells[y][x];
                    const player = this.players[playerId];
                    const piece = document.createElement('div');
                    piece.className = `piece ${player.color}`;
                    piece.style.cssText = `
                        width: 70%;
                        height: 70%;
                        border-radius: 50%;
                        background: linear-gradient(135deg, var(--${player.color}-color), var(--${player.color}-dark));
                        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
                        position: relative;
                        z-index: 10;
                    `;
                    cell.appendChild(piece);
                }
                
                // 绑定触摸和点击事件
                this.bindCellEvents(cell, x, y);
                
                fragment.appendChild(cell);
            }
        }

        gameBoard.appendChild(fragment);
        
        // 确保围墙正确绘制
        setTimeout(() => {
            this.drawWalls();
            this.updateTerritoriesDisplay();
        }, 100);
        
        console.log('棋盘创建完成，尺寸:', boardSizePx, '单元格数量:', this.boardSize * this.boardSize);
    }

    bindCellEvents(cell, x, y) {
        // 移动端触摸事件
        cell.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.touchStartTime = Date.now();
            this.lastTouch = { x, y };
        }, { passive: false });

        cell.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touchDuration = Date.now() - this.touchStartTime;
            
            // 防止长按误触
            if (touchDuration < 500) {
                this.handleCellClick(x, y);
            }
        }, { passive: false });

        // 桌面端点击事件
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleCellClick(x, y);
        });
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }

    drawWalls() {
        console.log('开始绘制围墙...');
        
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
                        top: ${y * cellSize - 3}px;
                        z-index: 5;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                        border-radius: 1px;
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
                        left: ${x * cellSize - 3}px;
                        top: ${y * cellSize}px;
                        z-index: 5;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                        border-radius: 1px;
                    `;
                    fragment.appendChild(wall);
                }
            }
        }

        gameBoard.appendChild(fragment);
        console.log('围墙绘制完成');
    }

    // 检测领地
    detectTerritories() {
        console.log('开始检测领地...');
        
        // 重置领地状态
        this.territories = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        
        // 重置玩家分数
        this.players.forEach(player => player.score = 0);
        
        const visited = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(false));
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (!visited[y][x]) {
                    const region = this.bfsRegion(x, y, visited);
                    
                    if (this.isRegionEnclosed(region)) {
                        const owner = this.getRegionOwner(region);
                        
                        if (owner !== null) {
                            // 标记领地
                            region.forEach(cell => {
                                this.territories[cell.y][cell.x] = owner;
                            });
                            
                            // 更新分数
                            this.players[owner].score += region.length;
                            
                            console.log(`玩家 ${this.players[owner].name} 获得领地，大小: ${region.length}, 新得分: ${this.players[owner].score}`);
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
            }
        });
    }

    // 检查棋子是否被困在领地内
    isPieceTrapped(x, y) {
        return this.territories[y][x] !== null;
    }

    handleCellClick(x, y) {
        console.log(`处理单元格点击: (${x}, ${y})`, {
            gameOver: this.gameOver,
            isAI: this.isCurrentPlayerAI(),
            phase: this.phase,
            selectedPiece: this.selectedPiece,
            hasMoved: this.hasMoved,
            isTrapped: this.isPieceTrapped(x, y)
        });
        
        if (this.gameOver) {
            console.log('游戏已结束，忽略点击');
            return;
        }
        
        if (this.isCurrentPlayerAI()) {
            console.log('AI回合，忽略点击');
            return;
        }

        // 检查当前玩家是否已投降
        if (this.players[this.currentPlayer].surrendered) {
            console.log('当前玩家已投降，忽略点击');
            return;
        }

        // 检查棋子是否被困
        if (this.phase === 'movement' && this.cells[y][x] === this.currentPlayer && this.isPieceTrapped(x, y)) {
            this.showMessage('这个棋子在领地内，无法移动！');
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
                fromCell.style.border = '1px solid #bdc3c7';
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
            cell.style.border = '1px solid #bdc3c7';
        });
    }

    showWallOptions(x, y) {
        this.clearWallOptions();

        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const boardSizePx = parseInt(gameBoard.style.width);
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
                    touch-action: manipulation;
                `;

                // 移动端触摸事件
                wallOption.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                }, { passive: true });

                wallOption.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    console.log(`选择围墙选项 ${option.number}`);
                    this.placeWall(option.wallX, option.wallY, option.orientation);
                }, { passive: true });

                // 桌面端点击事件
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

    placeWall(x, y, orientation) {
        console.log(`放置围墙: (${x}, ${y}), 方向: ${orientation}`);
        
        const currentPlayer = this.players[this.currentPlayer];
        
        // 检查围墙数量
        if (currentPlayer.walls <= 0 && this.config.maxWalls !== 999) {
            this.showMessage('围墙数量不足！');
            return;
        }

        // 检查是否可以放置围墙
        if (!this.canPlaceWall(x, y, orientation)) {
            this.showMessage('这里不能放置围墙！');
            return;
        }

        this.saveGameState();

        // 放置围墙
        if (orientation === 'horizontal') {
            this.horizontalWalls[y][x] = true;
        } else {
            this.verticalWalls[x][y] = true;
        }

        // 减少围墙数量
        if (this.config.maxWalls !== 999) {
            currentPlayer.walls--;
        }

        // 重新绘制围墙
        this.drawWalls();
        this.clearWallOptions();
        
        this.addGameLog(`${currentPlayer.name} 放置了围墙`);

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
            setTimeout(() => this.makeAIMove(), 500);
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

    bindEvents() {
        console.log('开始绑定事件...');
        this.bindButtonEvents();
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

        // 投降按钮
        const surrenderBtn = document.getElementById('surrender-btn');
        if (surrenderBtn) {
            surrenderBtn.addEventListener('click', (e) => {
                console.log('投降按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.surrender();
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

    // 投降功能
    surrender() {
        const currentPlayer = this.players[this.currentPlayer];
        
        if (confirm(`确定要投降吗？${currentPlayer.name}将退出游戏。`)) {
            currentPlayer.surrendered = true;
            this.addGameLog(`${currentPlayer.name} 投降了！`);
            
            // 检查是否所有玩家都投降了
            const activePlayers = this.players.filter(player => !player.surrendered);
            
            if (activePlayers.length <= 1) {
                // 只有一个玩家或没有玩家了，游戏结束
                this.gameOver = true;
                this.endGame();
            } else {
                // 继续游戏，跳过投降的玩家
                this.switchToNextPlayer();
                this.updateUI();
                
                // 如果下一个玩家是AI，自动移动
                if (this.isCurrentPlayerAI()) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }
        }
    }

    // 回顾游戏功能
    reviewGame() {
        console.log('回顾游戏');
        
        // 创建游戏回顾内容
        const reviewContent = this.createGameReview();
        this.showReviewModal(reviewContent);
    }

    createGameReview() {
        let review = '<h4>🎮 游戏回顾</h4>';
        review += `<p><strong>游戏模式:</strong> ${this.config.mode === 'single' ? '单人游戏' : '多人游戏'}</p>`;
        review += `<p><strong>棋盘大小:</strong> ${this.boardSize}×${this.boardSize}</p>`;
        review += `<p><strong>总回合数:</strong> ${this.turnCount}</p>`;
        review += `<p><strong>游戏阶段:</strong> ${this.phase === 'placement' ? '放置阶段' : '移动阶段'}</p>`;
        
        review += '<h5>👥 玩家表现:</h5>';
        
        this.players.forEach((player, index) => {
            const status = player.surrendered ? '🏳️ 已投降' : '🎯 游戏中';
            review += `<div class="review-player">
                <strong>${player.name}</strong> - 
                得分: ${player.score} | 
                棋子: ${player.pieces.length}/4 | 
                围墙: ${player.walls} |
                ${status}
            </div>`;
        });
        
        review += '<h5>📊 关键事件:</h5>';
        const logContent = document.getElementById('game-log');
        if (logContent) {
            const logEntries = logContent.querySelectorAll('.log-entry');
            const keyEvents = Array.from(logEntries)
                .filter(entry => {
                    const text = entry.textContent;
                    return text.includes('获得领地') || 
                           text.includes('投降') || 
                           text.includes('游戏结束') ||
                           text.includes('放置了围墙') ||
                           text.includes('移动了棋子');
                })
                .slice(-8); // 只显示最后8个关键事件
            
            if (keyEvents.length > 0) {
                keyEvents.forEach(entry => {
                    review += `<div class="review-event">${entry.textContent}</div>`;
                });
            } else {
                review += '<p>暂无关键事件记录</p>';
            }
        }
        
        return review;
    }

    showReviewModal(content) {
        // 创建回顾模态框
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: linear-gradient(135deg, var(--dark-color), var(--darker-color));
                padding: 24px;
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                color: white;
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 12px;
                ">
                    <h3 style="margin: 0; color: var(--light-color);">📊 游戏回顾</h3>
                    <button class="close-review-btn" style="
                        background: none;
                        border: none;
                        color: var(--gray-color);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                    ">&times;</button>
                </div>
                <div class="modal-body" style="line-height: 1.5;">
                    ${content}
                </div>
                <div class="modal-footer" style="
                    margin-top: 20px;
                    text-align: center;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 12px;
                ">
                    <button class="btn btn-primary" id="close-review" style="
                        padding: 10px 20px;
                        background: var(--primary-color);
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                        font-weight: 600;
                    ">关闭</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定关闭事件
        const closeBtn = modal.querySelector('.close-review-btn');
        const closeReviewBtn = modal.querySelector('#close-review');
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtn.addEventListener('click', closeModal);
        closeReviewBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

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
                currentPlayer: this.currentPlayer
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
                    await Utils.wait(500);
                    this.movePieceForAI(move.toX, move.toY);
                    
                    // AI放置围墙
                    await Utils.wait(500);
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
            selectedCell.style.border = '2px solid #f1c40f';
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
                
                // 重置单元格样式
                fromCell.style.backgroundColor = '';
                fromCell.style.border = '1px solid #bdc3c7';
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
        let nextPlayer = (this.currentPlayer + 1) % this.players.length;
        let attempts = 0;
        
        // 跳过投降的玩家
        while (this.players[nextPlayer].surrendered && attempts < this.players.length) {
            nextPlayer = (nextPlayer + 1) % this.players.length;
            attempts++;
        }
        
        this.currentPlayer = nextPlayer;
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
            if (player.pieces.length < 4 && !player.surrendered) {
                allPlayersHave4Pieces = false;
                break;
            }
        }
        
        if (allPlayersHave4Pieces && this.phase === 'placement') {
            this.phase = 'movement';
            this.addGameLog('进入移动阶段！');
        }
    }

    checkGameEnd() {
        // 检查是否所有玩家都投降了
        const activePlayers = this.players.filter(player => !player.surrendered);
        if (activePlayers.length <= 1) {
            this.gameOver = true;
            this.endGame();
            return;
        }
        
        // 检查是否所有玩家都无法移动
        let canAnyPlayerMove = false;
        
        for (const player of this.players) {
            if (player.surrendered) continue; // 跳过投降的玩家
            
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

    getValidPieceMoves(x, y) {
        const moves = [];
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            if (this.isValidMove(x, y, newX, newY)) {
                moves.push({ x: newX, y: newY });
            }
        }
        
        return moves;
    }

    endGame() {
        console.log('游戏结束！');
        
        // 过滤掉投降的玩家
        const activePlayers = this.players.filter(player => !player.surrendered);
        
        // 确定获胜者
        let maxScore = -1;
        let winners = [];
        
        activePlayers.forEach(player => {
            if (player.score > maxScore) {
                maxScore = player.score;
                winners = [player];
            } else if (player.score === maxScore) {
                winners.push(player);
            }
        });
        
        // 更新游戏统计
        this.updateGameStatistics(winners);
        
        this.showGameOverModal(winners, maxScore);
        this.addGameLog('游戏结束！');
    }

    // 更新游戏统计信息
    updateGameStatistics(winners) {
        try {
            // 获取当前统计
            const stats = settingsManager.settings;
            
            // 增加游戏次数
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            
            // 检查当前玩家是否获胜（人类玩家）
            const isHumanPlayerWinner = winners.some(winner => 
                winner.type === 'human' || !winner.type.startsWith('ai-')
            );
            
            if (isHumanPlayerWinner) {
                stats.gamesWon = (stats.gamesWon || 0) + 1;
            }
            
            // 更新最高得分
            const maxScore = Math.max(...this.players.map(p => p.score));
            if (maxScore > (stats.bestScore || 0)) {
                stats.bestScore = maxScore;
            }
            
            // 保存统计
            settingsManager.saveSettings();
            
            console.log('统计信息已更新:', {
                gamesPlayed: stats.gamesPlayed,
                gamesWon: stats.gamesWon,
                bestScore: stats.bestScore,
                winRate: settingsManager.getWinRate()
            });
            
        } catch (error) {
            console.error('更新统计信息时出错:', error);
        }
    }

    showGameOverModal(winners, winningScore) {
        const modal = document.getElementById('game-over-modal');
        const resultSummary = document.getElementById('result-summary');
        const scoreBoard = document.getElementById('final-score-board');
        
        if (!modal) return;
        
        // 更新结果摘要
        if (winners.length === 1) {
            resultSummary.innerHTML = `
                <h3>🎉 游戏结束！</h3>
                <p>${winners[0].name} 获胜！</p>
                <p>得分: ${winningScore}</p>
            `;
        } else {
            const winnerNames = winners.map(w => w.name).join('、');
            resultSummary.innerHTML = `
                <h3>🎉 游戏结束！</h3>
                <p>平局！${winnerNames} 共同获胜！</p>
                <p>得分: ${winningScore}</p>
            `;
        }
        
        // 更新得分板
        scoreBoard.innerHTML = '';
        this.players
            .sort((a, b) => b.score - a.score)
            .forEach(player => {
                const isWinner = winners.some(winner => winner.id === player.id);
                const isSurrendered = player.surrendered;
                const scoreItem = document.createElement('div');
                scoreItem.className = `score-item ${isWinner ? 'winner' : ''} ${isSurrendered ? 'surrendered' : ''}`;
                scoreItem.innerHTML = `
                    <div class="score-player">
                        <div class="score-player-color" style="background: var(--${player.color}-color)"></div>
                        <span class="score-player-name">${player.name} ${isSurrendered ? '(已投降)' : ''}</span>
                    </div>
                    <div class="score-value">${player.score}</div>
                `;
                scoreBoard.appendChild(scoreItem);
            });
        
        modal.classList.add('show');
    }

    isCurrentPlayerAI() {
        const currentPlayer = this.players[this.currentPlayer];
        return currentPlayer.type.startsWith('ai-');
    }

    saveGameState() {
        this.history.push({
            cells: Utils.deepClone(this.cells),
            horizontalWalls: Utils.deepClone(this.horizontalWalls),
            verticalWalls: Utils.deepClone(this.verticalWalls),
            players: Utils.deepClone(this.players),
            currentPlayer: this.currentPlayer,
            phase: this.phase,
            territories: Utils.deepClone(this.territories)
        });
        
        // 限制历史记录数量
        if (this.history.length > (this.config.maxUndoSteps || 10) + 1) {
            this.history.shift();
        }
    }

    undoMove() {
        console.log('悔棋');
        if (this.history.length > 1 && this.config.allowUndo && !this.isCurrentPlayerAI()) {
            // 移除当前状态
            this.history.pop();
            // 获取上一个状态
            const previousState = this.history[this.history.length - 1];
            
            // 恢复游戏状态
            this.cells = Utils.deepClone(previousState.cells);
            this.horizontalWalls = Utils.deepClone(previousState.horizontalWalls);
            this.verticalWalls = Utils.deepClone(previousState.verticalWalls);
            this.players = Utils.deepClone(previousState.players);
            this.currentPlayer = previousState.currentPlayer;
            this.phase = previousState.phase;
            this.territories = Utils.deepClone(previousState.territories);
            
            // 重置UI状态
            this.selectedPiece = null;
            this.hasMoved = false;
            this.wallOptions = [];
            
            // 重新创建棋盘
            this.recreateBoard();
            this.updateUI();
            
            this.addGameLog(`${this.players[this.currentPlayer].name} 悔棋`);
        } else {
            this.showMessage('无法悔棋');
        }
    }

    recreateBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;
        
        // 清除现有内容但保留样式
        const boardSizePx = parseInt(gameBoard.style.width) || 500;
        gameBoard.innerHTML = '';
        gameBoard.style.width = `${boardSizePx}px`;
        gameBoard.style.height = `${boardSizePx}px`;
        
        // 重新设置网格
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gap = '0px';
        
        const fragment = document.createDocumentFragment();

        // 重新创建单元格和棋子
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // 设置单元格样式
                cell.style.border = '1px solid #bdc3c7';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.position = 'relative';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.15s ease';
                cell.style.backgroundColor = '#ffffff';
                cell.style.userSelect = 'none';
                cell.style.webkitUserSelect = 'none';
                cell.style.webkitTapHighlightColor = 'transparent';
                
                // 如果有棋子，重新创建
                if (this.cells[y][x] !== null) {
                    const playerId = this.cells[y][x];
                    const player = this.players[playerId];
                    const piece = document.createElement('div');
                    piece.className = `piece ${player.color}`;
                    piece.style.cssText = `
                        width: 70%;
                        height: 70%;
                        border-radius: 50%;
                        background: linear-gradient(135deg, var(--${player.color}-color), var(--${player.color}-dark));
                        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
                        position: relative;
                        z-index: 10;
                    `;
                    cell.appendChild(piece);
                }
                
                // 绑定事件
                this.bindCellEvents(cell, x, y);
                
                fragment.appendChild(cell);
            }
        }

        gameBoard.appendChild(fragment);
        
        // 重新绘制围墙和领地
        setTimeout(() => {
            this.drawWalls();
            this.updateTerritoriesDisplay();
        }, 50);
    }

    changePiece() {
        console.log('更换棋子');
        this.selectedPiece = null;
        this.clearHighlights();
    }

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
        logEntry.textContent = `[${Utils.formatTime(0)}] ${message}`;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    updateUI() {
        console.log('更新UI');
        
        // 显示/隐藏玩家面板
        this.players.forEach((player, index) => {
            const playerInfo = document.getElementById(`player${index + 1}-info`);
            if (playerInfo) {
                if (index < this.players.length) {
                    playerInfo.classList.remove('hidden');
                    
                    // 更新投降状态显示
                    if (player.surrendered) {
                        playerInfo.style.opacity = '0.5';
                        const typeElement = playerInfo.querySelector('.player-type');
                        if (typeElement) {
                            typeElement.textContent = '已投降';
                        }
                    } else {
                        playerInfo.style.opacity = '1';
                    }
                } else {
                    playerInfo.classList.add('hidden');
                }
            }
            
            const piecesElement = document.getElementById(`player${index + 1}-pieces`);
            const wallsElement = document.getElementById(`player${index + 1}-walls`);
            const scoreElement = document.getElementById(`player${index + 1}-score`);
            
            if (piecesElement) piecesElement.textContent = `${player.pieces.length}/4`;
            if (wallsElement) wallsElement.textContent = this.config.maxWalls === 999 ? '∞' : player.walls;
            if (scoreElement) scoreElement.textContent = player.score;

            // 更新当前玩家指示
            if (playerInfo) {
                playerInfo.classList.toggle('active', index === this.currentPlayer && !player.surrendered);
            }
        });

        // 更新阶段显示
        const phaseText = document.querySelector('.phase-text');
        if (phaseText) {
            phaseText.textContent = this.phase === 'placement' ? '放置阶段' : '移动阶段';
        }

        // 更新回合显示
        const turnText = document.querySelector('.turn-text');
        if (turnText) {
            turnText.textContent = `${this.players[this.currentPlayer].name}的回合`;
        }

        const turnCount = document.getElementById('turn-count');
        if (turnCount) {
            turnCount.textContent = this.turnCount;
        }

        // 更新控制按钮状态
        const changePieceBtn = document.getElementById('change-piece-btn');
        const undoBtn = document.getElementById('undo-btn');
        const surrenderBtn = document.getElementById('surrender-btn');
        
        if (changePieceBtn) {
            changePieceBtn.disabled = this.phase !== 'movement' || this.hasMoved || this.selectedPiece === null || this.isCurrentPlayerAI();
        }
        
        if (undoBtn) {
            undoBtn.disabled = this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI();
        }
        
        if (surrenderBtn) {
            surrenderBtn.disabled = this.isCurrentPlayerAI() || this.players[this.currentPlayer].surrendered;
        }
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== 游戏页面加载完成 ===');
    
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

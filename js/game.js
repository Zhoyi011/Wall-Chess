
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
        if (!gameBoard) return;

        // 设置棋盘网格
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        
        // 设置CSS变量
        document.documentElement.style.setProperty('--board-size', this.boardSize);

        gameBoard.innerHTML = '';
        const fragment = document.createDocumentFragment();

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => this.handleCellClick(x, y));
                fragment.appendChild(cell);
            }
        }

        gameBoard.appendChild(fragment);
        this.drawWalls();
    }

    bindEvents() {
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
        
        if (currentPlayer.pieces.length >= 4) return;
        if (this.cells[y][x] !== null) return;

        this.saveGameState();
        
        this.cells[y][x] = this.currentPlayer;
        currentPlayer.pieces.push({ x, y });

        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        const piece = document.createElement('div');
        piece.className = `piece ${currentPlayer.color}`;
        cell.appendChild(piece);

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
            selectedCell.classList.add('selected');
            
            this.showValidMoves(x, y);
        }
    }

    movePiece(x, y) {
        if (!this.selectedPiece) return;

        const fromX = this.selectedPiece.x;
        const fromY = this.selectedPiece.y;

        if (!this.isValidMove(fromX, fromY, x, y)) return;

        this.saveGameState();

        this.cells[fromY][fromX] = null;
        this.cells[y][x] = this.currentPlayer;

        // 移动DOM元素
        const fromCell = document.querySelector(`.cell[data-x="${fromX}"][data-y="${fromY}"]`);
        const toCell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        const piece = fromCell.querySelector('.piece');
        fromCell.removeChild(piece);
        toCell.appendChild(piece);

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
                cell.classList.add('highlight');
            }
        });
    }

    showWallOptions(x, y) {
        this.clearWallOptions();

        const options = [];
        const cellSize = 500 / this.boardSize;

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

        const fragment = document.createDocumentFragment();
        const gameBoard = document.getElementById('game-board');

        options.forEach(option => {
            if (this.canPlaceWall(option.wallX, option.wallY, option.orientation)) {
                const wallOption = document.createElement('div');
                wallOption.className = 'wall-option';
                wallOption.textContent = option.number;
                
                // 位置调整
                let left = option.left;
                let top = option.top;
                
                if (option.orientation === 'horizontal') {
                    if (option.wallY === 0) top = 0;
                    else if (option.wallY === this.boardSize) top = 500 - 15;
                    
                    if (left < 0) left = 0;
                    if (left > 500 - 30) left = 500 - 30;
                } else {
                    if (option.wallX === 0) left = 0;
                    else if (option.wallX === this.boardSize) left = 500 - 15;
                    
                    if (top < 0) top = 0;
                    if (top > 500 - 30) top = 500 - 30;
                }
                
                wallOption.style.left = `${left}px`;
                wallOption.style.top = `${top}px`;
                wallOption.dataset.wallX = option.wallX;
                wallOption.dataset.wallY = option.wallY;
                wallOption.dataset.orientation = option.orientation;

                wallOption.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.placeWall(option.wallX, option.wallY, option.orientation);
                });

                fragment.appendChild(wallOption);
                this.wallOptions.push(wallOption);
            }
        });

        gameBoard.appendChild(fragment);
    }

    canPlaceWall(x, y, orientation) {
        if (orientation === 'horizontal') {
            if (y < 0 || y >= this.horizontalWalls.length) return false;
            if (x < 0 || x >= this.horizontalWalls[y].length) return false;
            return !this.horizontalWalls[y][x];
        } else {
            if (x < 0 || x >= this.verticalWalls.length) return false;
            if (y < 0 || y >= this.verticalWalls[x].length) return false;
            return !this.verticalWalls[x][y];
        }
    }

    placeWall(x, y, orientation) {
        const currentPlayer = this.players[this.currentPlayer];
        
        if (currentPlayer.walls <= 0 && this.config.maxWalls !== 999) {
            this.showMessage('围墙数量不足！');
            return;
        }

        this.saveGameState();

        if (orientation === 'horizontal') {
            this.horizontalWalls[y][x] = true;
        } else {
            this.verticalWalls[x][y] = true;
        }

        if (this.config.maxWalls !== 999) {
            currentPlayer.walls--;
        }

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
            this.makeAIMove();
        }
    }

    switchToNextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.hasMoved = false;
        this.selectedPiece = null;
        this.turnCount++;
        
        // 清除高亮
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

    isPieceTrapped(x, y) {
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
                return false;
            }
        }
        
        return true;
    }

    detectTerritories() {
        // 清除之前的领地标记
        this.clearTerritories();
        
        // 重置得分
        this.players.forEach(player => player.score = 0);
        
        // 标记所有访问过的格子
        const visited = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(false));
        
        // 遍历所有格子
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (!visited[y][x]) {
                    // 使用BFS找到连通区域
                    const region = this.bfsRegion(x, y, visited);
                    
                    // 检查这个区域是否被完全包围
                    if (this.isRegionEnclosed(region)) {
                        // 确定区域内的棋子所有者
                        const owner = this.getRegionOwner(region);
                        
                        if (owner !== null) {
                            // 标记领地
                            this.markTerritory(region, owner);
                            
                            // 更新得分
                            this.players[owner].score += region.length;
                        }
                    }
                }
            }
        }
    }

    bfsRegion(startX, startY, visited) {
        const region = [];
        const queue = [{x: startX, y: startY}];
        visited[startY][startX] = true;
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            region.push({x, y});
            
            // 检查四个方向
            const directions = [
                {dx: 0, dy: -1}, // 上
                {dx: 0, dy: 1},  // 下
                {dx: -1, dy: 0}, // 左
                {dx: 1, dy: 0}   // 右
            ];
            
            for (const dir of directions) {
                const newX = x + dir.dx;
                const newY = y + dir.dy;
                
                // 检查是否在边界内且未被访问
                if (newX >= 0 && newX < this.boardSize && 
                    newY >= 0 && newY < this.boardSize && 
                    !visited[newY][newX]) {
                    
                    // 检查是否有围墙阻挡
                    if (!this.isWallBetween(x, y, newX, newY)) {
                        visited[newY][newX] = true;
                        queue.push({x: newX, y: newY});
                    }
                }
            }
        }
        
        return region;
    }

    isWallBetween(x1, y1, x2, y2) {
        if (x1 === x2) {
            // 垂直移动
            const wallY = Math.min(y1, y2) + 1;
            return this.horizontalWalls[wallY] && this.horizontalWalls[wallY][x1];
        } else {
            // 水平移动
            const wallX = Math.min(x1, x2) + 1;
            return this.verticalWalls[wallX] && this.verticalWalls[wallX][y1];
        }
    }

    isRegionEnclosed(region) {
        for (const cell of region) {
            const {x, y} = cell;
            
            // 检查四个方向是否有出口
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

    markTerritory(region, owner) {
        for (const cell of region) {
            const {x, y} = cell;
            const cellElement = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (cellElement) {
                cellElement.classList.add(`territory-${this.players[owner].color}`);
            }
        }
    }

    clearTerritories() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('territory-player1', 'territory-player2', 'territory-player3', 'territory-player4');
        });
    }

    drawWalls() {
        // 清除现有围墙
        const existingWalls = document.querySelectorAll('.wall');
        existingWalls.forEach(wall => wall.remove());

        const gameBoard = document.getElementById('game-board');
        const cellSize = 500 / this.boardSize;
        const fragment = document.createDocumentFragment();

        // 绘制水平围墙
        for (let y = 0; y < this.horizontalWalls.length; y++) {
            for (let x = 0; x < this.horizontalWalls[y].length; x++) {
                if (this.horizontalWalls[y][x]) {
                    const wall = document.createElement('div');
                    wall.className = 'wall horizontal';
                    wall.style.width = `${cellSize}px`;
                    wall.style.left = `${x * cellSize}px`;
                    wall.style.top = `${(y - 0.5) * cellSize}px`;
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
                    wall.style.height = `${cellSize}px`;
                    wall.style.left = `${(x - 0.5) * cellSize}px`;
                    wall.style.top = `${y * cellSize}px`;
                    fragment.appendChild(wall);
                }
            }
        }

        gameBoard.appendChild(fragment);
    }

    clearHighlights() {
        const highlightedCells = document.querySelectorAll('.cell.highlight, .cell.selected');
        highlightedCells.forEach(cell => {
            cell.classList.remove('highlight', 'selected');
        });
    }

    clearWallOptions() {
        this.wallOptions.forEach(option => option.remove());
        this.wallOptions = [];
    }

    saveGameState() {
        this.history.push({
            cells: Utils.deepClone(this.cells),
            horizontalWalls: Utils.deepClone(this.horizontalWalls),
            verticalWalls: Utils.deepClone(this.verticalWalls),
            players: Utils.deepClone(this.players),
            currentPlayer: this.currentPlayer,
            phase: this.phase,
            selectedPiece: this.selectedPiece,
            hasMoved: this.hasMoved
        });
        
        // 限制历史记录数量
        if (this.history.length > this.config.maxUndoSteps + 1) {
            this.history.shift();
        }
        
        this.updateUndoButton();
    }

    undoMove() {
        if (this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI()) {
            return;
        }
        
        // 弹出当前状态
        this.history.pop();
        
        // 恢复到上一个状态
        const previousState = this.history.pop();
        this.restoreGameState(previousState);
        
        this.addGameLog('撤销了上一步操作');
    }

    restoreGameState(state) {
        this.cells = state.cells;
        this.horizontalWalls = state.horizontalWalls;
        this.verticalWalls = state.verticalWalls;
        this.players = state.players;
        this.currentPlayer = state.currentPlayer;
        this.phase = state.phase;
        this.selectedPiece = state.selectedPiece;
        this.hasMoved = state.hasMoved;
        
        this.recreateBoard();
        this.updateUI();
    }

    recreateBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => this.handleCellClick(x, y));
                
                if (this.cells[y][x] !== null) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${this.players[this.cells[y][x]].color}`;
                    cell.appendChild(piece);
                }
                
                fragment.appendChild(cell);
            }
        }
        
        gameBoard.appendChild(fragment);
        this.drawWalls();
        this.detectTerritories();
    }

    updateUI() {
        // 更新玩家信息
        this.players.forEach((player, index) => {
            const playerInfo = document.getElementById(`player${index + 1}-info`);
            if (playerInfo) {
                playerInfo.classList.toggle('active', index === this.currentPlayer);
                playerInfo.classList.toggle('hidden', index >= this.players.length);
                
                document.getElementById(`player${index + 1}-pieces`).textContent = 
                    `${player.pieces.length}/4`;
                document.getElementById(`player${index + 1}-walls`).textContent = 
                    this.config.maxWalls === 999 ? '∞' : player.walls;
                document.getElementById(`player${index + 1}-score`).textContent = 
                    player.score;
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
        document.querySelector('.turn-text').textContent = `${currentPlayer.name}的回合`;
        document.getElementById('turn-count').textContent = this.turnCount;

        // 更新控制按钮状态
        document.getElementById('change-piece-btn').disabled = 
            this.phase !== 'movement' || this.hasMoved || this.selectedPiece === null;
        document.getElementById('undo-btn').disabled = 
            this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI();

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
    }

    isCurrentPlayerAI() {
        const currentPlayer = this.players[this.currentPlayer];
        return currentPlayer.type.startsWith('ai-');
    }

    async makeAIMove() {
        if (this.gameOver || !this.isCurrentPlayerAI()) return;

        const aiPlayer = this.aiPlayers.get(this.currentPlayer);
        if (!aiPlayer) return;

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
            if (move.type === 'placement') {
                this.placePiece(move.x, move.y);
            } else if (move.type === 'movement') {
                this.selectPiece(move.fromX, move.fromY);
                this.movePiece(move.toX, move.toY);
                
                // AI自动选择围墙
                if (this.hasMoved) {
                    const wallOptions = aiPlayer.getWallOptionsForAI(gameState, move.toX, move.toY);
                    const bestWall = aiPlayer.chooseBestWallOption(wallOptions);
                    if (bestWall) {
                        setTimeout(() => {
                            this.placeWall(bestWall.wallX, bestWall.wallY, bestWall.orientation);
                        }, 500);
                    } else {
                        this.switchToNextPlayer();
                        this.updateUI();
                    }
                }
            }
        } else {
            // 如果没有有效移动，跳过回合
            this.switchToNextPlayer();
            this.updateUI();
        }
    }

    changePiece() {
        if (this.phase !== 'movement' || this.hasMoved || !this.selectedPiece) return;
        
        this.selectedPiece = null;
        this.clearHighlights();
        this.addGameLog(`${this.players[this.currentPlayer].name} 更换了选择的棋子`);
    }

    passTurn() {
        if (this.phase !== 'movement' || this.hasMoved) return;
        
        this.saveGameState();
        this.addGameLog(`${this.players[this.currentPlayer].name} 跳过了回合`);
        this.switchToNextPlayer();
        this.updateUI();
        
        if (this.isCurrentPlayerAI()) {
            this.makeAIMove();
        }
    }

    checkGameEnd() {
        // 检查是否所有玩家都无法移动
        let canAnyPlayerMove = false;
        
        for (const player of this.players) {
            for (const piece of player.pieces) {
                if (!this.isPieceTrapped(piece.x, piece.y)) {
                    canAnyPlayerMove = true;
                    break;
                }
            }
            if (canAnyPlayerMove) break;
        }
        
        if (!canAnyPlayerMove) {
            this.endGame();
        }
    }

    endGame() {
        this.gameOver = true;
        
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
        
        // 显示游戏结束弹窗
        this.showGameOverModal(winners, maxScore);
        
        // 更新统计
        settingsManager.incrementStat('gamesPlayed');
        if (winners.some(winner => winner.type === 'human')) {
            settingsManager.incrementStat('gamesWon');
        }
        if (maxScore > settingsManager.settings.bestScore) {
            settingsManager.updateSetting('bestScore', maxScore);
        }
        
        this.addGameLog('游戏结束！');
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
        
        // 更新获胜者庆祝
        winnerCelebration.innerHTML = `
            <h3>🏆 恭喜获胜者！</h3>
            <p>精彩的策略对决！</p>
        `;
        
        // 更新得分板
        scoreBoard.innerHTML = '';
        this.players
            .sort((a, b) => b.score - a.score)
            .forEach(player => {
                const isWinner = winners.some(winner => winner.id === player.id);
                const scoreItem = document.createElement('div');
                scoreItem.className = `score-item ${isWinner ? 'winner' : ''}`;
                scoreItem.innerHTML = `
                    <div class="score-player">
                        <div class="score-player-color" style="background: var(--${player.color}-color)"></div>
                        <span class="score-player-name">${player.name}</span>
                    </div>
                    <div class="score-value">${player.score}</div>
                `;
                scoreBoard.appendChild(scoreItem);
            });
        
        modal.classList.add('show');
    }

    showPauseMenu() {
        const modal = document.getElementById('pause-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    hidePauseMenu() {
        const modal = document.getElementById('pause-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    restartGame() {
        if (confirm('确定要重新开始游戏吗？')) {
            const gameConfig = Utils.storage.get('currentGameConfig');
            if (gameConfig) {
                window.location.reload();
            }
        }
    }

    returnToMenu() {
        if (confirm('确定要返回主菜单吗？当前游戏进度将丢失。')) {
            window.location.href = 'index.html';
        }
    }

    showSettings() {
        this.hidePauseMenu();
        // 这里可以跳转到设置页面或显示设置弹窗
        alert('设置功能将在后续版本中添加');
    }

    reviewGame() {
        alert('游戏回顾功能将在后续版本中添加');
    }

    showHints() {
        if (!this.config.showHints) {
            this.showMessage('提示功能已禁用，请在设置中启用');
            return;
        }
        
        if (this.phase === 'placement') {
            this.showMessage('提示：尽量将棋子放置在棋盘中央区域');
        } else {
            this.showMessage('提示：尝试移动棋子来创造有利的围墙放置位置');
        }
    }

    showMessage(message) {
        // 创建临时消息提示
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 2000);
    }

    addGameLog(message) {
        const logContent = document.getElementById('game-log');
        if (!logContent) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `[${Utils.formatTime(0)}] ${message}`;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.disabled = this.history.length < 2 || !this.config.allowUndo || this.isCurrentPlayerAI();
        }
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    const gameConfig = Utils.storage.get('currentGameConfig');
    
    if (gameConfig) {
        // 更新游戏信息显示
        document.getElementById('game-mode').textContent = 
            gameConfig.mode === 'single' ? 
            `单人游戏 - ${gameConfig.difficulty}难度` : 
            `多人游戏 - ${gameConfig.players}人`;
        document.getElementById('board-size').textContent = 
            `${gameConfig.boardSize}×${gameConfig.boardSize}`;
        
        // 初始化游戏
        new WallGame(gameConfig);
    } else {
        // 如果没有游戏配置，返回主菜单
        alert('没有找到游戏配置，返回主菜单');
        window.location.href = 'index.html';
    }
});
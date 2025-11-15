// 增强版AI玩家类
class AIPlayer {
    constructor(difficulty, playerId) {
        this.difficulty = difficulty;
        this.playerId = playerId;
        this.thinkingTime = this.getThinkingTime();
    }

    getThinkingTime() {
        switch (this.difficulty) {
            case 'easy': return 800 + Math.random() * 800;
            case 'medium': return 1200 + Math.random() * 1000;
            case 'hard': return 2000 + Math.random() * 1500;
            default: return 1000;
        }
    }

    async makeMove(gameState) {
        // 显示AI思考指示器
        this.showThinkingIndicator();
        
        // 根据难度等待不同的时间
        await Utils.wait(this.thinkingTime);
        
        let move;
        switch (this.difficulty) {
            case 'easy':
                move = this.makeEasyMove(gameState);
                break;
            case 'medium':
                move = this.makeMediumMove(gameState);
                break;
            case 'hard':
                move = await this.makeHardMove(gameState);
                break;
            default:
                move = this.makeMediumMove(gameState);
        }
        
        // 隐藏思考指示器
        this.hideThinkingIndicator();
        
        return move;
    }

    // 简单AI：随机移动但避免明显错误
    makeEasyMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;
        
        // 优先选择能围地的移动
        const territoryMoves = validMoves.filter(move => 
            this.evaluateMovePotential(gameState, move) > 2
        );
        
        if (territoryMoves.length > 0) {
            return territoryMoves[Utils.randomInt(0, territoryMoves.length - 1)];
        }
        
        // 随机选择一个移动
        return validMoves[Utils.randomInt(0, validMoves.length - 1)];
    }

    // 中等AI：基于策略的移动
    makeMediumMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;

        // 评估每个移动的得分
        const scoredMoves = validMoves.map(move => ({
            move,
            score: this.evaluateMove(gameState, move)
        }));

        // 按得分排序
        scoredMoves.sort((a, b) => b.score - a.score);
        
        // 选择前25%的移动中随机一个（增加一些随机性）
        const topMoves = scoredMoves.slice(0, Math.max(1, Math.floor(scoredMoves.length * 0.25)));
        return topMoves[Utils.randomInt(0, topMoves.length - 1)].move;
    }

    // 困难AI：使用Minimax算法
    async makeHardMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;
        const depth = this.getSearchDepth();

        // 评估每个可能的移动
        for (const move of validMoves) {
            const simulatedState = this.simulateMove(gameState, move);
            const score = this.minimax(simulatedState, depth - 1, false, -Infinity, Infinity);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || validMoves[0];
    }

    getSearchDepth() {
        switch (this.difficulty) {
            case 'easy': return 1;
            case 'medium': return 2;
            case 'hard': return 3;
            default: return 2;
        }
    }

    // 评估移动的潜在价值
    evaluateMovePotential(gameState, move) {
        let score = 0;
        
        if (move.type === 'placement') {
            // 放置棋子在中部区域更有价值
            const centerX = gameState.boardSize / 2;
            const centerY = gameState.boardSize / 2;
            const distanceFromCenter = Math.abs(move.x - centerX) + Math.abs(move.y - centerY);
            score += (gameState.boardSize - distanceFromCenter) * 2;
            
            // 靠近其他棋子有价值（形成集团）
            const nearbyPieces = this.countNearbyPieces(gameState, move.x, move.y, this.playerId);
            score += nearbyPieces * 3;
        } else {
            // 移动棋子评估
            const fromValue = this.getPositionValue(gameState, move.fromX, move.fromY);
            const toValue = this.getPositionValue(gameState, move.toX, move.toY);
            score += (toValue - fromValue) * 2;
            
            // 移动后能形成领地更有价值
            const territoryPotential = this.evaluateTerritoryPotentialAfterMove(gameState, move);
            score += territoryPotential * 5;
        }
        
        return score;
    }

    // 评估移动的综合价值
    evaluateMove(gameState, move) {
        let score = 0;
        
        // 基础移动价值
        score += this.evaluateMovePotential(gameState, move);
        
        // 领地潜力
        score += this.evaluateTerritoryPotential(gameState, move) * 8;
        
        // 阻碍对手
        score += this.evaluateOpponentBlocking(gameState, move) * 6;
        
        // 棋子安全性
        score += this.evaluatePieceSafety(gameState, move) * 4;
        
        return score;
    }

    // 评估领地潜力
    evaluateTerritoryPotential(gameState, move) {
        let potential = 0;
        
        if (move.type === 'placement') {
            // 检查放置棋子后能否形成领地
            potential += this.estimateTerritorySize(gameState, move.x, move.y, this.playerId);
        } else {
            // 检查移动后能否形成领地
            potential += this.estimateTerritorySize(gameState, move.toX, move.toY, this.playerId);
        }
        
        return potential;
    }

    // 评估阻碍对手的能力
    evaluateOpponentBlocking(gameState, move) {
        let blockingScore = 0;
        
        // 获取所有对手
        const opponents = gameState.players.filter(player => player.id !== this.playerId);
        
        opponents.forEach(opponent => {
            // 评估这个移动对对手的阻碍程度
            if (move.type === 'placement') {
                // 放置棋子在对手可能扩张的路径上
                blockingScore += this.evaluatePositionBlocking(gameState, move.x, move.y, opponent.id);
            } else {
                // 移动棋子阻碍对手
                blockingScore += this.evaluatePositionBlocking(gameState, move.toX, move.toY, opponent.id);
            }
        });
        
        return blockingScore;
    }

    // 评估棋子安全性
    evaluatePieceSafety(gameState, move) {
        if (move.type === 'movement') {
            // 检查目标位置是否安全（不被立即围困）
            const safety = this.evaluatePositionSafety(gameState, move.toX, move.toY);
            return safety;
        }
        return 0;
    }

    // 估算领地大小
    estimateTerritorySize(gameState, x, y, playerId) {
        let size = 0;
        const visited = new Set();
        const queue = [{x, y}];
        visited.add(`${x},${y}`);
        
        while (queue.length > 0 && size < 20) { // 限制搜索深度
            const current = queue.shift();
            size++;
            
            const directions = [
                {dx: 0, dy: -1}, {dx: 0, dy: 1},
                {dx: -1, dy: 0}, {dx: 1, dy: 0}
            ];
            
            for (const dir of directions) {
                const newX = current.x + dir.dx;
                const newY = current.y + dir.dy;
                
                if (newX >= 0 && newX < gameState.boardSize && 
                    newY >= 0 && newY < gameState.boardSize) {
                    const key = `${newX},${newY}`;
                    
                    if (!visited.has(key) && 
                        gameState.cells[newY][newX] === null &&
                        !this.isWallBetween(gameState, current.x, current.y, newX, newY)) {
                        visited.add(key);
                        queue.push({x: newX, y: newY});
                    }
                }
            }
        }
        
        return size;
    }

    // 评估位置阻碍价值
    evaluatePositionBlocking(gameState, x, y, opponentId) {
        let blockingValue = 0;
        
        // 检查这个位置是否在对手的扩张路径上
        const opponentPieces = gameState.players[opponentId].pieces;
        
        opponentPieces.forEach(piece => {
            const distance = Math.abs(piece.x - x) + Math.abs(piece.y - y);
            if (distance <= 3) {
                blockingValue += (4 - distance);
            }
        });
        
        return blockingValue;
    }

    // 评估位置安全性
    evaluatePositionSafety(gameState, x, y) {
        let escapeRoutes = 0;
        
        const directions = [
            {dx: 0, dy: -1}, {dx: 0, dy: 1},
            {dx: -1, dy: 0}, {dx: 1, dy: 0}
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < gameState.boardSize && 
                newY >= 0 && newY < gameState.boardSize &&
                gameState.cells[newY][newX] === null &&
                !this.isWallBetween(gameState, x, y, newX, newY)) {
                escapeRoutes++;
            }
        }
        
        return escapeRoutes;
    }

    // 计算附近棋子数量
    countNearbyPieces(gameState, x, y, playerId) {
        let count = 0;
        const directions = [
            {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1},
            {dx: -1, dy: 0},                     {dx: 1, dy: 0},
            {dx: -1, dy: 1},  {dx: 0, dy: 1},  {dx: 1, dy: 1}
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < gameState.boardSize && 
                newY >= 0 && newY < gameState.boardSize &&
                gameState.cells[newY][newX] === playerId) {
                count++;
            }
        }
        
        return count;
    }

    // 获取位置价值（中部更有价值）
    getPositionValue(gameState, x, y) {
        const centerX = gameState.boardSize / 2;
        const centerY = gameState.boardSize / 2;
        const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
        return (gameState.boardSize - distanceFromCenter);
    }

    // Minimax算法 with Alpha-Beta剪枝
    minimax(state, depth, isMaximizing, alpha, beta) {
        if (depth === 0 || this.isTerminalState(state)) {
            return this.evaluateState(state);
        }

        const validMoves = this.getAllValidMoves(state);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of validMoves) {
                const simulatedState = this.simulateMove(state, move);
                const evaluation = this.minimax(simulatedState, depth - 1, false, alpha, beta);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // Alpha-Beta剪枝
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of validMoves) {
                const simulatedState = this.simulateMove(state, move);
                const evaluation = this.minimax(simulatedState, depth - 1, true, alpha, beta);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // Alpha-Beta剪枝
            }
            return minEval;
        }
    }

    // 评估状态得分
    evaluateState(state) {
        let score = 0;
        const myPlayer = state.players[this.playerId];
        const otherPlayers = state.players.filter((_, index) => index !== this.playerId);

        // 当前得分
        score += myPlayer.score * 20;

        // 棋子移动性
        const mobility = this.calculateMobility(state, this.playerId);
        score += mobility * 3;

        // 领地潜力
        const territoryPotential = this.evaluateTotalTerritoryPotential(state, this.playerId);
        score += territoryPotential * 8;

        // 棋子位置价值
        const positionValue = this.evaluatePiecePositions(state, this.playerId);
        score += positionValue * 2;

        // 阻碍对手
        for (const player of otherPlayers) {
            const opponentMobility = this.calculateMobility(state, player.id);
            score -= opponentMobility * 2;
            
            const opponentPotential = this.evaluateTotalTerritoryPotential(state, player.id);
            score -= opponentPotential * 6;
        }

        return score;
    }

    // 评估总领地潜力
    evaluateTotalTerritoryPotential(state, playerId) {
        let totalPotential = 0;
        const player = state.players[playerId];
        
        for (const piece of player.pieces) {
            totalPotential += this.estimateTerritorySize(state, piece.x, piece.y, playerId);
        }
        
        return totalPotential;
    }

    // 评估棋子位置价值
    evaluatePiecePositions(state, playerId) {
        let totalValue = 0;
        const player = state.players[playerId];
        
        for (const piece of player.pieces) {
            totalValue += this.getPositionValue(state, piece.x, piece.y);
        }
        
        return totalValue;
    }

    // 计算移动性
    calculateMobility(state, playerId) {
        let mobility = 0;
        const player = state.players[playerId];

        for (const piece of player.pieces) {
            mobility += this.getValidPieceMoves(state, piece.x, piece.y).length;
        }

        return mobility;
    }

    // 获取所有有效移动
    getAllValidMoves(gameState) {
        const moves = [];
        const currentPlayer = gameState.players[this.playerId];

        if (gameState.phase === 'placement') {
            // 放置阶段的移动
            for (let y = 0; y < gameState.boardSize; y++) {
                for (let x = 0; x < gameState.boardSize; x++) {
                    if (gameState.cells[y][x] === null && currentPlayer.pieces.length < 4) {
                        moves.push({ type: 'placement', x, y });
                    }
                }
            }
        } else {
            // 移动阶段的移动
            for (const piece of currentPlayer.pieces) {
                const validMoves = this.getValidPieceMoves(gameState, piece.x, piece.y);
                for (const move of validMoves) {
                    moves.push({
                        type: 'movement',
                        fromX: piece.x,
                        fromY: piece.y,
                        toX: move.x,
                        toY: move.y
                    });
                }
            }
        }

        return moves;
    }

    // 获取棋子的有效移动
    getValidPieceMoves(gameState, x, y) {
        const moves = [];
        const directions = [
            { dx: 0, dy: -1 }, // 上
            { dx: 0, dy: 1 },  // 下
            { dx: -1, dy: 0 }, // 左
            { dx: 1, dy: 0 }   // 右
        ];

        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (this.isValidMove(gameState, x, y, newX, newY)) {
                moves.push({ x: newX, y: newY });
            }
        }

        return moves;
    }

    // 检查移动是否有效
    isValidMove(gameState, fromX, fromY, toX, toY) {
        if (toX < 0 || toX >= gameState.boardSize || toY < 0 || toY >= gameState.boardSize) {
            return false;
        }
        if (gameState.cells[toY][toX] !== null) {
            return false;
        }
        
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // 检查围墙阻挡
            if (dx === 1) {
                const wallX = Math.min(fromX, toX) + 1;
                const wallY = fromY;
                if (gameState.verticalWalls[wallX] && gameState.verticalWalls[wallX][wallY]) {
                    return false;
                }
            } else {
                const wallX = fromX;
                const wallY = Math.min(fromY, toY) + 1;
                if (gameState.horizontalWalls[wallY] && gameState.horizontalWalls[wallY][wallX]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    // 检查围墙阻挡
    isWallBetween(gameState, x1, y1, x2, y2) {
        if (x1 === x2) {
            // 垂直移动 - 检查水平围墙
            const wallY = Math.min(y1, y2) + 1;
            return gameState.horizontalWalls[wallY] && gameState.horizontalWalls[wallY][x1];
        } else {
            // 水平移动 - 检查垂直围墙
            const wallX = Math.min(x1, x2) + 1;
            return gameState.verticalWalls[wallX] && gameState.verticalWalls[wallX][y1];
        }
    }

    // 模拟移动
    simulateMove(state, move) {
        const newState = Utils.deepClone(state);

        if (move.type === 'placement') {
            newState.cells[move.y][move.x] = this.playerId;
            newState.players[this.playerId].pieces.push({ x: move.x, y: move.y });
            
            // 检查阶段转换
            if (newState.players[this.playerId].pieces.length === 4) {
                let allPlayersHave4Pieces = true;
                for (const player of newState.players) {
                    if (player.pieces.length < 4) {
                        allPlayersHave4Pieces = false;
                        break;
                    }
                }
                if (allPlayersHave4Pieces) {
                    newState.phase = 'movement';
                }
            }
        } else {
            newState.cells[move.fromY][move.fromX] = null;
            newState.cells[move.toY][move.toX] = this.playerId;
            
            const piece = newState.players[this.playerId].pieces.find(
                p => p.x === move.fromX && p.y === move.fromY
            );
            if (piece) {
                piece.x = move.toX;
                piece.y = move.toY;
            }
        }

        return newState;
    }

    // 检查是否为终止状态
    isTerminalState(state) {
        // 检查是否所有玩家都无法移动
        for (const player of state.players) {
            for (const piece of player.pieces) {
                if (this.getValidPieceMoves(state, piece.x, piece.y).length > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    // 获取围墙选项（用于AI选择围墙）
    getWallOptionsForAI(gameState, x, y) {
        const options = [];

        // 水平围墙选项
        if (y > 0) {
            options.push({
                wallX: x,
                wallY: y,
                orientation: 'horizontal'
            });
        }

        if (y < gameState.boardSize) {
            options.push({
                wallX: x,
                wallY: y + 1,
                orientation: 'horizontal'
            });
        }

        // 垂直围墙选项
        if (x > 0) {
            options.push({
                wallX: x,
                wallY: y,
                orientation: 'vertical'
            });
        }

        if (x < gameState.boardSize) {
            options.push({
                wallX: x + 1,
                wallY: y,
                orientation: 'vertical'
            });
        }

        // 过滤掉不能放置的围墙
        return options.filter(option => 
            this.canPlaceWall(gameState, option.wallX, option.wallY, option.orientation)
        );
    }

    // 检查是否可以放置围墙
    canPlaceWall(gameState, x, y, orientation) {
        if (orientation === 'horizontal') {
            if (y < 0 || y >= gameState.horizontalWalls.length) return false;
            if (x < 0 || x >= gameState.horizontalWalls[y].length) return false;
            return !gameState.horizontalWalls[y][x];
        } else {
            if (x < 0 || x >= gameState.verticalWalls.length) return false;
            if (y < 0 || y >= gameState.verticalWalls[x].length) return false;
            return !gameState.verticalWalls[x][y];
        }
    }

    // 选择最佳围墙选项
    chooseBestWallOption(wallOptions) {
        if (wallOptions.length === 0) return null;
        
        // 简单策略：随机选择一个（可以在这里添加更复杂的围墙选择逻辑）
        return wallOptions[Utils.randomInt(0, wallOptions.length - 1)];
    }

    // 显示思考指示器
    showThinkingIndicator() {
        const indicator = document.getElementById('ai-thinking-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    // 隐藏思考指示器
    hideThinkingIndicator() {
        const indicator = document.getElementById('ai-thinking-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }
}

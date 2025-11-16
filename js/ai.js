// 终极加强版AI玩家类
class AIPlayer {
    constructor(difficulty, playerId) {
        this.difficulty = difficulty;
        this.playerId = playerId;
        this.thinkingTime = this.getThinkingTime();
        this.transpositionTable = new Map(); // 置换表
    }

    getThinkingTime() {
        switch (this.difficulty) {
            case 'easy': return 500 + Math.random() * 500;
            case 'medium': return 1000 + Math.random() * 1000;
            case 'hard': return 2000 + Math.random() * 1500;
            default: return 1000;
        }
    }

    async makeMove(gameState) {
        this.showThinkingIndicator();
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
        
        this.hideThinkingIndicator();
        return move;
    }

    // 简单AI：基础策略
    makeEasyMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;
        
        // 简单评估
        const scoredMoves = validMoves.map(move => ({
            move,
            score: this.evaluateMoveSimple(gameState, move)
        }));
        
        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0].move;
    }

    // 中等AI：策略性思考
    makeMediumMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;

        const scoredMoves = validMoves.map(move => ({
            move,
            score: this.evaluateMove(gameState, move)
        }));

        scoredMoves.sort((a, b) => b.score - a.score);
        
        // 加入一些随机性，但偏向好棋
        const topMoves = scoredMoves.slice(0, Math.max(1, Math.floor(scoredMoves.length * 0.3)));
        return topMoves[Utils.randomInt(0, topMoves.length - 1)].move;
    }

    // 困难AI：使用强化搜索算法
    async makeHardMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;
        const depth = this.getSearchDepth();

        // 使用迭代加深
        for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
            let currentBestMove = null;
            let currentBestScore = -Infinity;
            
            for (const move of validMoves) {
                const simulatedState = this.simulateMove(gameState, move);
                const score = this.alphaBeta(simulatedState, currentDepth - 1, -Infinity, Infinity, false);
                
                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                }
            }
            
            if (currentBestMove) {
                bestMove = currentBestMove;
                bestScore = currentBestScore;
            }
        }

        return bestMove || validMoves[0];
    }

    getSearchDepth() {
        switch (this.difficulty) {
            case 'easy': return 1;
            case 'medium': return 2;
            case 'hard': return 4; // 增加搜索深度
            default: return 2;
        }
    }

    // Alpha-Beta 搜索
    alphaBeta(state, depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || this.isTerminalState(state)) {
            return this.evaluateStateAdvanced(state);
        }

        const validMoves = this.getAllValidMoves(state);

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of validMoves) {
                const simulatedState = this.simulateMove(state, move);
                const evaluation = this.alphaBeta(simulatedState, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of validMoves) {
                const simulatedState = this.simulateMove(state, move);
                const evaluation = this.alphaBeta(simulatedState, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // 简单移动评估
    evaluateMoveSimple(gameState, move) {
        let score = 0;
        
        if (move.type === 'placement') {
            // 中心控制
            const centerValue = this.getPositionValue(gameState, move.x, move.y);
            score += centerValue;
            
            // 靠近现有棋子
            const nearbyPieces = this.countNearbyPieces(gameState, move.x, move.y, this.playerId);
            score += nearbyPieces * 2;
        } else {
            // 移动价值
            const fromValue = this.getPositionValue(gameState, move.fromX, move.fromY);
            const toValue = this.getPositionValue(gameState, move.toX, move.toY);
            score += (toValue - fromValue) * 3;
        }
        
        return score;
    }

    // 综合移动评估
    evaluateMove(gameState, move) {
        let score = 0;
        
        // 基础价值
        score += this.evaluateMoveSimple(gameState, move);
        
        // 领地潜力
        score += this.evaluateTerritoryPotential(gameState, move) * 15;
        
        // 阻碍对手
        score += this.evaluateOpponentBlocking(gameState, move) * 12;
        
        // 棋子安全性
        score += this.evaluatePieceSafety(gameState, move) * 8;
        
        // 移动灵活性
        score += this.evaluateMobility(gameState, move) * 6;
        
        return score;
    }

    // 高级状态评估
    evaluateStateAdvanced(state) {
        let score = 0;
        const myPlayer = state.players[this.playerId];
        const opponents = state.players.filter((_, index) => index !== this.playerId);

        // 当前得分（最重要）
        score += myPlayer.score * 50;

        // 领地控制潜力
        const territoryPotential = this.evaluateTotalTerritoryPotential(state, this.playerId);
        score += territoryPotential * 20;

        // 棋子位置优势
        const positionAdvantage = this.evaluatePositionAdvantage(state, this.playerId);
        score += positionAdvantage * 10;

        // 移动性优势
        const mobilityAdvantage = this.evaluateMobilityAdvantage(state, this.playerId);
        score += mobilityAdvantage * 8;

        // 阻碍对手
        for (const opponent of opponents) {
            const opponentPotential = this.evaluateTotalTerritoryPotential(state, opponent.id);
            score -= opponentPotential * 15;
            
            const opponentMobility = this.evaluateMobilityAdvantage(state, opponent.id);
            score -= opponentMobility * 6;
            
            // 特别关注领先的对手
            if (opponent.score > myPlayer.score) {
                score -= (opponent.score - myPlayer.score) * 30;
            }
        }

        // 游戏阶段调整
        const gamePhase = this.getGamePhase(state);
        if (gamePhase === 'early') {
            score += positionAdvantage * 5; // 早期位置更重要
        } else if (gamePhase === 'late') {
            score += myPlayer.score * 30; // 晚期得分更重要
        }

        return score;
    }

    // 评估位置优势
    evaluatePositionAdvantage(state, playerId) {
        let advantage = 0;
        const player = state.players[playerId];
        const boardSize = state.boardSize;
        const center = Math.floor(boardSize / 2);
        
        for (const piece of player.pieces) {
            // 中心控制
            const distanceFromCenter = Math.abs(piece.x - center) + Math.abs(piece.y - center);
            advantage += (boardSize - distanceFromCenter) * 2;
            
            // 棋子连接性
            const connectivity = this.evaluatePieceConnectivity(state, piece.x, piece.y, playerId);
            advantage += connectivity * 3;
            
            // 边界安全
            const borderSafety = this.evaluateBorderSafety(piece.x, piece.y, boardSize);
            advantage += borderSafety;
        }
        
        return advantage;
    }

    // 评估棋子连接性
    evaluatePieceConnectivity(state, x, y, playerId) {
        let connectivity = 0;
        const directions = [
            {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1},
            {dx: -1, dy: 0},                     {dx: 1, dy: 0},
            {dx: -1, dy: 1},  {dx: 0, dy: 1},  {dx: 1, dy: 1}
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < state.boardSize && 
                newY >= 0 && newY < state.boardSize &&
                state.cells[newY][newX] === playerId) {
                connectivity++;
            }
        }
        
        return connectivity;
    }

    // 评估边界安全
    evaluateBorderSafety(x, y, boardSize) {
        const distanceToBorder = Math.min(x, y, boardSize - 1 - x, boardSize - 1 - y);
        return distanceToBorder;
    }

    // 评估移动性优势
    evaluateMobilityAdvantage(state, playerId) {
        let mobility = 0;
        const player = state.players[playerId];

        for (const piece of player.pieces) {
            // 检查棋子是否被困
            if (this.isPieceTrapped(state, piece.x, piece.y)) {
                mobility -= 5; // 被困棋子严重惩罚
                continue;
            }
            
            const validMoves = this.getValidPieceMoves(state, piece.x, piece.y);
            mobility += validMoves.length;
            
            // 高质量移动（通往开放区域）
            for (const move of validMoves) {
                const futureMobility = this.getValidPieceMoves(state, move.x, move.y).length;
                mobility += futureMobility * 0.5;
            }
        }

        return mobility;
    }

    // 检查棋子是否被困（修复bug #3）
    isPieceTrapped(state, x, y) {
        // 如果棋子已经在领地内，则不能移动
        if (state.territories && state.territories[y] && state.territories[y][x] !== null) {
            return true;
        }
        
        // 检查是否有有效移动
        return this.getValidPieceMoves(state, x, y).length === 0;
    }

    // 评估领地潜力
    evaluateTerritoryPotential(gameState, move) {
        let potential = 0;
        
        if (move.type === 'placement') {
            potential = this.estimateTerritorySize(gameState, move.x, move.y, this.playerId);
        } else {
            potential = this.estimateTerritorySize(gameState, move.toX, move.toY, this.playerId);
            
            // 移动后可能形成的新领地
            const newTerritoryPotential = this.evaluateNewTerritoryFormation(gameState, move);
            potential += newTerritoryPotential;
        }
        
        return potential;
    }

    // 评估新领地形成
    evaluateNewTerritoryFormation(gameState, move) {
        if (move.type !== 'movement') return 0;
        
        let newTerritory = 0;
        
        // 模拟移动后的状态
        const simulatedState = this.simulateMove(gameState, move);
        
        // 检查是否形成了新的封闭区域
        const directions = [
            {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}
        ];
        
        for (const dir of directions) {
            const checkX = move.toX + dir.dx;
            const checkY = move.toY + dir.dy;
            
            if (checkX >= 0 && checkX < gameState.boardSize && 
                checkY >= 0 && checkY < gameState.boardSize &&
                simulatedState.cells[checkY][checkX] === null) {
                
                const regionSize = this.estimateEnclosedRegion(simulatedState, checkX, checkY);
                if (regionSize > 0) {
                    newTerritory += regionSize;
                }
            }
        }
        
        return newTerritory;
    }

    // 估计封闭区域大小
    estimateEnclosedRegion(state, startX, startY) {
        const visited = new Set();
        const queue = [{x: startX, y: startY}];
        visited.add(`${startX},${startY}`);
        let size = 0;
        let isEnclosed = true;
        
        while (queue.length > 0 && size < 50) {
            const current = queue.shift();
            size++;
            
            const directions = [
                {dx: 0, dy: -1}, {dx: 0, dy: 1},
                {dx: -1, dy: 0}, {dx: 1, dy: 0}
            ];
            
            for (const dir of directions) {
                const newX = current.x + dir.dx;
                const newY = current.y + dir.dy;
                
                if (newX < 0 || newX >= state.boardSize || 
                    newY < 0 || newY >= state.boardSize) {
                    isEnclosed = false;
                    continue;
                }
                
                const key = `${newX},${newY}`;
                if (!visited.has(key) && state.cells[newY][newX] === null) {
                    visited.add(key);
                    queue.push({x: newX, y: newY});
                }
            }
        }
        
        return isEnclosed ? size : 0;
    }

    // 评估阻碍对手
    evaluateOpponentBlocking(gameState, move) {
        let blockingScore = 0;
        const opponents = gameState.players.filter(player => player.id !== this.playerId);
        
        opponents.forEach(opponent => {
            // 阻碍对手扩张
            blockingScore += this.evaluateExpansionBlocking(gameState, move, opponent.id);
            
            // 分割对手棋子
            blockingScore += this.evaluateSeparationPotential(gameState, move, opponent.id);
        });
        
        return blockingScore;
    }

    // 评估扩张阻碍
    evaluateExpansionBlocking(gameState, move, opponentId) {
        let blocking = 0;
        const opponentPieces = gameState.players[opponentId].pieces;
        
        opponentPieces.forEach(piece => {
            const distance = Math.abs(piece.x - (move.type === 'placement' ? move.x : move.toX)) + 
                           Math.abs(piece.y - (move.type === 'placement' ? move.y : move.toY));
            
            if (distance <= 2) {
                blocking += (3 - distance) * 2;
            }
        });
        
        return blocking;
    }

    // 评估分割潜力
    evaluateSeparationPotential(gameState, move, opponentId) {
        // 这个移动是否能把对手棋子分割开
        let separation = 0;
        
        if (move.type === 'placement') {
            // 放置棋子可能分割对手
            separation += this.checkSeparation(gameState, move.x, move.y, opponentId);
        }
        
        return separation;
    }

    // 检查分割效果
    checkSeparation(gameState, x, y, opponentId) {
        // 简化版分割检查
        const opponentPieces = gameState.players[opponentId].pieces;
        if (opponentPieces.length < 2) return 0;
        
        // 检查这个位置是否在对手棋子之间
        let separation = 0;
        for (let i = 0; i < opponentPieces.length; i++) {
            for (let j = i + 1; j < opponentPieces.length; j++) {
                const piece1 = opponentPieces[i];
                const piece2 = opponentPieces[j];
                const distance1 = Math.abs(piece1.x - x) + Math.abs(piece1.y - y);
                const distance2 = Math.abs(piece2.x - x) + Math.abs(piece2.y - y);
                
                if (distance1 <= 2 && distance2 <= 2) {
                    separation += 5;
                }
            }
        }
        
        return separation;
    }

    // 评估棋子安全性
    evaluatePieceSafety(gameState, move) {
        if (move.type === 'movement') {
            const safety = this.evaluatePositionSafety(gameState, move.toX, move.toY);
            return safety;
        }
        return 0;
    }

    // 评估移动灵活性
    evaluateMobility(gameState, move) {
        if (move.type === 'movement') {
            const futureMobility = this.getValidPieceMoves(gameState, move.toX, move.toY).length;
            return futureMobility;
        }
        return 0;
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

    // 获取游戏阶段
    getGamePhase(state) {
        const totalPieces = state.players.reduce((sum, player) => sum + player.pieces.length, 0);
        const maxPieces = state.players.length * 4;
        
        if (totalPieces < maxPieces * 0.5) return 'early';
        if (totalPieces < maxPieces * 0.8) return 'mid';
        return 'late';
    }

    // 原有辅助方法保持不变
    estimateTerritorySize(gameState, x, y, playerId) {
        let size = 0;
        const visited = new Set();
        const queue = [{x, y}];
        visited.add(`${x},${y}`);
        
        while (queue.length > 0 && size < 25) {
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

    evaluateTotalTerritoryPotential(state, playerId) {
        let totalPotential = 0;
        const player = state.players[playerId];
        
        for (const piece of player.pieces) {
            totalPotential += this.estimateTerritorySize(state, piece.x, piece.y, playerId);
        }
        
        return totalPotential;
    }

    getPositionValue(gameState, x, y) {
        const centerX = gameState.boardSize / 2;
        const centerY = gameState.boardSize / 2;
        const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
        return (gameState.boardSize - distanceFromCenter);
    }

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

    // 其他原有方法保持不变...
    getAllValidMoves(gameState) {
        const moves = [];
        const currentPlayer = gameState.players[this.playerId];

        if (gameState.phase === 'placement') {
            for (let y = 0; y < gameState.boardSize; y++) {
                for (let x = 0; x < gameState.boardSize; x++) {
                    if (gameState.cells[y][x] === null && currentPlayer.pieces.length < 4) {
                        moves.push({ type: 'placement', x, y });
                    }
                }
            }
        } else {
            for (const piece of currentPlayer.pieces) {
                // 修复bug #3：检查棋子是否被困
                if (this.isPieceTrapped(gameState, piece.x, piece.y)) {
                    continue;
                }
                
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

    getValidPieceMoves(gameState, x, y) {
        const moves = [];
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
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

    isValidMove(gameState, fromX, fromY, toX, toY) {
        if (toX < 0 || toX >= gameState.boardSize || toY < 0 || toY >= gameState.boardSize) {
            return false;
        }
        if (gameState.cells[toY][toX] !== null) {
            return false;
        }
        
        // 修复bug #3：检查棋子是否被困
        if (gameState.territories && gameState.territories[fromY] && 
            gameState.territories[fromY][fromX] !== null) {
            return false;
        }
        
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
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

    isWallBetween(gameState, x1, y1, x2, y2) {
        if (x1 === x2) {
            const wallY = Math.min(y1, y2) + 1;
            return gameState.horizontalWalls[wallY] && gameState.horizontalWalls[wallY][x1];
        } else {
            const wallX = Math.min(x1, x2) + 1;
            return gameState.verticalWalls[wallX] && gameState.verticalWalls[wallX][y1];
        }
    }

    simulateMove(state, move) {
        const newState = Utils.deepClone(state);

        if (move.type === 'placement') {
            newState.cells[move.y][move.x] = this.playerId;
            newState.players[this.playerId].pieces.push({ x: move.x, y: move.y });
            
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

    isTerminalState(state) {
        for (const player of state.players) {
            for (const piece of player.pieces) {
                if (this.getValidPieceMoves(state, piece.x, piece.y).length > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    getWallOptionsForAI(gameState, x, y) {
        const options = [];

        if (y > 0) {
            options.push({ wallX: x, wallY: y, orientation: 'horizontal' });
        }
        if (y < gameState.boardSize) {
            options.push({ wallX: x, wallY: y + 1, orientation: 'horizontal' });
        }
        if (x > 0) {
            options.push({ wallX: x, wallY: y, orientation: 'vertical' });
        }
        if (x < gameState.boardSize) {
            options.push({ wallX: x + 1, wallY: y, orientation: 'vertical' });
        }

        return options.filter(option => 
            this.canPlaceWall(gameState, option.wallX, option.wallY, option.orientation)
        );
    }

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

    chooseBestWallOption(wallOptions) {
        if (wallOptions.length === 0) return null;
        return wallOptions[Utils.randomInt(0, wallOptions.length - 1)];
    }

    showThinkingIndicator() {
        const indicator = document.getElementById('ai-thinking-indicator');
        if (indicator) indicator.classList.remove('hidden');
    }

    hideThinkingIndicator() {
        const indicator = document.getElementById('ai-thinking-indicator');
        if (indicator) indicator.classList.add('hidden');
    }
}

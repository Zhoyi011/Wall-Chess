// AI玩家类
class AIPlayer {
    constructor(difficulty, playerId) {
        this.difficulty = difficulty;
        this.playerId = playerId;
        this.thinkingTime = this.getThinkingTime();
    }

    getThinkingTime() {
        switch (this.difficulty) {
            case 'easy': return 500 + Math.random() * 1000;
            case 'medium': return 1000 + Math.random() * 1500;
            case 'hard': return 2000 + Math.random() * 2000;
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
                move = this.makeEasyMove(gameState);
        }
        
        // 隐藏思考指示器
        this.hideThinkingIndicator();
        
        return move;
    }

    // 简单AI：随机移动
    makeEasyMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;
        
        // 随机选择一个移动
        const randomMove = validMoves[Utils.randomInt(0, validMoves.length - 1)];
        return randomMove;
    }

    // 中等AI：基于简单策略
    makeMediumMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;

        // 优先选择能围地的移动
        const territoryMoves = validMoves.filter(move => 
            this.evaluateTerritoryPotential(gameState, move) > 0
        );

        if (territoryMoves.length > 0) {
            // 选择能围最大领地的移动
            territoryMoves.sort((a, b) => 
                this.evaluateTerritoryPotential(gameState, b) - 
                this.evaluateTerritoryPotential(gameState, a)
            );
            return territoryMoves[0];
        }

        // 如果没有围地机会，随机选择
        return validMoves[Utils.randomInt(0, validMoves.length - 1)];
    }

    // 困难AI：使用Minimax算法
    async makeHardMove(gameState) {
        const validMoves = this.getAllValidMoves(gameState);
        if (validMoves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;
        const depth = 2; // 搜索深度

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

    // 评估状态得分
    evaluateState(state) {
        let score = 0;
        const myPlayer = state.players[this.playerId];
        const otherPlayers = state.players.filter((_, index) => index !== this.playerId);

        // 当前得分
        score += myPlayer.score * 10;

        // 棋子移动性
        const mobility = this.calculateMobility(state, this.playerId);
        score += mobility * 2;

        // 领地潜力
        const territoryPotential = this.evaluateTerritoryPotential(state);
        score += territoryPotential * 5;

        // 阻碍对手
        for (const player of otherPlayers) {
            const opponentMobility = this.calculateMobility(state, player.id);
            score -= opponentMobility;
        }

        return score;
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

    // 评估领地潜力
    evaluateTerritoryPotential(state, move = null) {
        // 简化版的领地潜力评估
        // 在实际实现中，这里应该使用BFS来检测潜在的领地
        let potential = 0;
        
        // 检查当前玩家棋子的周围区域
        const myPlayer = state.players[this.playerId];
        for (const piece of myPlayer.pieces) {
            // 检查棋子周围的空位数量
            const emptyNeighbors = this.countEmptyNeighbors(state, piece.x, piece.y);
            potential += emptyNeighbors;
        }
        
        return potential;
    }

    // 计算空邻居数量
    countEmptyNeighbors(state, x, y) {
        let count = 0;
        const directions = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
            { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
        ];

        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < state.boardSize && newY >= 0 && newY < state.boardSize) {
                if (state.cells[newY][newX] === null) {
                    count++;
                }
            }
        }
        
        return count;
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
        
        // 简单策略：随机选择一个
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
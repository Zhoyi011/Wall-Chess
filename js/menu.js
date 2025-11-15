// 菜单管理器
class MenuManager {
    constructor() {
        this.currentModal = null;
        this.selectedDifficulty = 'medium';
        this.selectedPlayers = 2;
        this.playerConfigs = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStatistics();
        this.setupPlayerConfigs();
    }

    bindEvents() {
        // 主菜单按钮
        document.getElementById('single-player-btn')?.addEventListener('click', () => {
            this.showModal('single-player-modal');
        });

        document.getElementById('multi-player-btn')?.addEventListener('click', () => {
            this.showModal('multi-player-modal');
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.showModal('settings-modal');
        });

        document.getElementById('instructions-btn')?.addEventListener('click', () => {
            this.showModal('instructions-modal');
        });

        document.getElementById('credits-btn')?.addEventListener('click', () => {
            this.showModal('credits-modal');
        });

        // 难度选择
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDifficulty(btn.dataset.difficulty);
            });
        });

        // 玩家数量选择
        document.querySelectorAll('.player-count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectPlayerCount(parseInt(btn.dataset.players));
            });
        });

        // 开始游戏按钮
        document.getElementById('start-single-player')?.addEventListener('click', () => {
            this.startSinglePlayerGame();
        });

        document.getElementById('start-multi-player')?.addEventListener('click', () => {
            this.startMultiPlayerGame();
        });

        // 设置保存
        document.getElementById('save-settings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // 关闭按钮
        document.querySelectorAll('.close-btn, .btn-cancel, .btn-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal();
            });
        });

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hideModal();
            }
        });
    }

    showModal(modalId) {
        this.hideModal(); // 先隐藏当前模态框

        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            this.currentModal = modal;
            
            // 播放音效
            soundManager.play('click');
            
            // 如果是多人游戏模态框，初始化玩家配置
            if (modalId === 'multi-player-modal') {
                this.updatePlayerConfigs(this.selectedPlayers);
            }
        }
    }

    hideModal() {
        if (this.currentModal) {
            this.currentModal.classList.remove('show');
            this.currentModal = null;
        }
    }

    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        
        // 更新UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.querySelector(`.difficulty-btn[data-difficulty="${difficulty}"]`)?.classList.add('selected');
        
        soundManager.play('click');
    }

    selectPlayerCount(playerCount) {
        this.selectedPlayers = playerCount;
        
        // 更新UI
        document.querySelectorAll('.player-count-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`.player-count-btn[data-players="${playerCount}"]`)?.classList.add('active');
        
        // 更新玩家配置
        this.updatePlayerConfigs(playerCount);
        
        soundManager.play('click');
    }

    setupPlayerConfigs() {
        this.playerConfigs = [
            { id: 0, name: '玩家1', type: 'human', color: 'player1' },
            { id: 1, name: '玩家2', type: 'human', color: 'player2' },
            { id: 2, name: '玩家3', type: 'human', color: 'player3' },
            { id: 3, name: '玩家4', type: 'human', color: 'player4' }
        ];
    }

    updatePlayerConfigs(playerCount) {
        const configContainer = document.getElementById('player-configs');
        if (!configContainer) return;

        configContainer.innerHTML = '';

        for (let i = 0; i < playerCount; i++) {
            const config = this.playerConfigs[i];
            const configElement = this.createPlayerConfigElement(config, i);
            configContainer.appendChild(configElement);
        }
    }

    createPlayerConfigElement(config, index) {
        const div = document.createElement('div');
        div.className = 'player-config-item';
        div.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: var(--border-radius-sm);
            margin-bottom: 8px;
        `;
        div.innerHTML = `
            <div class="config-header" style="display: flex; align-items: center; gap: 12px;">
                <div class="player-color" style="width: 20px; height: 20px; border-radius: 50%; background: var(--${config.color}-color)"></div>
                <span class="player-name" style="color: var(--light-color); font-weight: 600;">${config.name}</span>
            </div>
            <div class="config-controls">
                <select class="player-type-select" data-index="${index}" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: var(--border-radius-sm);
                    color: var(--light-color);
                    padding: 6px 12px;
                ">
                    <option value="human" ${config.type === 'human' ? 'selected' : ''}>人类</option>
                    <option value="ai-easy" ${config.type === 'ai-easy' ? 'selected' : ''}>AI - 简单</option>
                    <option value="ai-medium" ${config.type === 'ai-medium' ? 'selected' : ''}>AI - 中等</option>
                    <option value="ai-hard" ${config.type === 'ai-hard' ? 'selected' : ''}>AI - 困难</option>
                </select>
            </div>
        `;

        // 绑定事件
        const select = div.querySelector('.player-type-select');
        select.addEventListener('change', (e) => {
            this.updatePlayerType(index, e.target.value);
        });

        return div;
    }

    updatePlayerType(playerIndex, playerType) {
        this.playerConfigs[playerIndex].type = playerType;
        soundManager.play('click');
    }

    startSinglePlayerGame() {
        console.log('开始单人游戏...');
        
        const boardSize = parseInt(document.getElementById('board-size')?.value || 9);
        const wallCount = parseInt(document.getElementById('wall-count')?.value || 15);

        const gameConfig = settingsManager.getGameConfig('single', 2, this.selectedDifficulty);
        gameConfig.boardSize = boardSize;
        gameConfig.maxWalls = wallCount;
        
        // 设置玩家配置
        gameConfig.playerConfigs = [
            { id: 0, name: '玩家1', type: 'human', color: 'player1' },
            { id: 1, name: 'AI对手', type: `ai-${this.selectedDifficulty}`, color: 'player2' }
        ];

        console.log('游戏配置:', gameConfig);
        this.startGame(gameConfig);
    }

    startMultiPlayerGame() {
        console.log('开始多人游戏...');
        
        const boardSize = parseInt(document.getElementById('mp-board-size')?.value || 9);
        const wallCount = parseInt(document.getElementById('mp-wall-count')?.value || 15);

        const gameConfig = settingsManager.getGameConfig('multi', this.selectedPlayers);
        gameConfig.boardSize = boardSize;
        gameConfig.maxWalls = wallCount;
        gameConfig.playerConfigs = this.playerConfigs.slice(0, this.selectedPlayers);

        console.log('多人游戏配置:', gameConfig);
        this.startGame(gameConfig);
    }

    startGame(gameConfig) {
        try {
            // 验证游戏配置
            if (!gameConfig || !gameConfig.playerConfigs || gameConfig.playerConfigs.length === 0) {
                console.error('无效的游戏配置:', gameConfig);
                this.showError('游戏配置无效，请重试');
                return;
            }

            // 确保统计信息已初始化
            this.initializeStatistics();

            // 保存游戏配置到本地存储
            const success = Utils.storage.set('currentGameConfig', gameConfig);
            if (!success) {
                console.error('保存游戏配置失败');
                this.showError('保存游戏配置失败，请检查浏览器设置');
                return;
            }

            console.log('游戏配置已保存，准备跳转...');
            
            // 播放开始音效
            soundManager.play('start');
            
            // 隐藏模态框
            this.hideModal();
            
            // 跳转到游戏页面
            setTimeout(() => {
                console.log('正在跳转到游戏页面...');
                window.location.href = 'game.html';
            }, 500);
            
        } catch (error) {
            console.error('启动游戏时出错:', error);
            this.showError('启动游戏时出错: ' + error.message);
        }
    }

    // 初始化统计信息
    initializeStatistics() {
        const stats = settingsManager.settings;
        
        // 确保统计字段存在
        if (stats.gamesPlayed === undefined) stats.gamesPlayed = 0;
        if (stats.gamesWon === undefined) stats.gamesWon = 0;
        if (stats.bestScore === undefined) stats.bestScore = 0;
        if (stats.totalPlayTime === undefined) stats.totalPlayTime = 0;
        
        settingsManager.saveSettings();
    }

    saveSettings() {
        try {
            // 获取所有设置值
            const soundEnabled = document.getElementById('sound-enabled')?.checked || true;
            const animationsEnabled = document.getElementById('animations-enabled')?.checked || true;
            const theme = document.getElementById('theme-select')?.value || 'default';
            const undoEnabled = document.getElementById('undo-enabled')?.checked || true;
            const hintsEnabled = document.getElementById('hints-enabled')?.checked || false;
            const maxUndo = parseInt(document.getElementById('max-undo')?.value || 10);

            // 更新设置
            settingsManager.updateSetting('soundEnabled', soundEnabled);
            settingsManager.updateSetting('animationsEnabled', animationsEnabled);
            settingsManager.updateSetting('theme', theme);
            settingsManager.updateSetting('allowUndo', undoEnabled);
            settingsManager.updateSetting('showHints', hintsEnabled);
            settingsManager.updateSetting('maxUndoSteps', maxUndo);

            // 隐藏模态框
            this.hideModal();
            
            // 播放确认音效
            soundManager.play('confirm');
            
            this.showMessage('设置已保存！');
            
        } catch (error) {
            console.error('保存设置时出错:', error);
            this.showError('保存设置时出错');
        }
    }

    loadStatistics() {
        try {
            const stats = settingsManager.settings;
            
            // 确保统计字段存在
            this.initializeStatistics();
            
            const gamesPlayed = stats.gamesPlayed || 0;
            const bestScore = stats.bestScore || 0;
            const winRate = settingsManager.getWinRate();

            console.log('加载统计信息:', { gamesPlayed, bestScore, winRate });

            // 更新UI显示
            const gamesPlayedElement = document.getElementById('games-played');
            const bestScoreElement = document.getElementById('best-score');
            const winRateElement = document.getElementById('win-rate');

            if (gamesPlayedElement) gamesPlayedElement.textContent = gamesPlayed;
            if (bestScoreElement) bestScoreElement.textContent = bestScore;
            if (winRateElement) winRateElement.textContent = `${winRate}%`;

        } catch (error) {
            console.error('加载统计信息时出错:', error);
        }
    }

    showError(message) {
        alert('错误: ' + message);
    }

    showMessage(message) {
        // 创建临时消息提示
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 12px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            font-size: 14px;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('菜单页面加载完成，初始化菜单管理器...');
    new MenuManager();
});

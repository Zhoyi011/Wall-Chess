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
        div.innerHTML = `
            <div class="config-header">
                <div class="player-color" style="background: var(--${config.color}-color)"></div>
                <span class="player-name">${config.name}</span>
            </div>
            <div class="config-controls">
                <select class="player-type-select" data-index="${index}">
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
        const boardSize = parseInt(document.getElementById('board-size').value);
        const wallCount = parseInt(document.getElementById('wall-count').value);

        const gameConfig = settingsManager.getGameConfig('single', 2, this.selectedDifficulty);
        gameConfig.boardSize = boardSize;
        gameConfig.maxWalls = wallCount;
        
        // 设置玩家配置
        gameConfig.playerConfigs = [
            { id: 0, name: '玩家1', type: 'human', color: 'player1' },
            { id: 1, name: 'AI对手', type: `ai-${this.selectedDifficulty}`, color: 'player2' }
        ];

        this.startGame(gameConfig);
    }

    startMultiPlayerGame() {
        const boardSize = parseInt(document.getElementById('mp-board-size').value);
        const wallCount = parseInt(document.getElementById('mp-wall-count').value);

        const gameConfig = settingsManager.getGameConfig('multi', this.selectedPlayers);
        gameConfig.boardSize = boardSize;
        gameConfig.maxWalls = wallCount;
        gameConfig.playerConfigs = this.playerConfigs.slice(0, this.selectedPlayers);

        this.startGame(gameConfig);
    }

    startGame(gameConfig) {
        // 保存游戏配置到本地存储
        Utils.storage.set('currentGameConfig', gameConfig);
        
        // 播放开始音效
        soundManager.play('start');
        
        // 跳转到游戏页面
        setTimeout(() => {
            window.location.href = 'game.html';
        }, 500);
    }

    saveSettings() {
        // 获取所有设置值
        const soundEnabled = document.getElementById('sound-enabled').checked;
        const animationsEnabled = document.getElementById('animations-enabled').checked;
        const theme = document.getElementById('theme-select').value;
        const undoEnabled = document.getElementById('undo-enabled').checked;
        const hintsEnabled = document.getElementById('hints-enabled').checked;
        const maxUndo = parseInt(document.getElementById('max-undo').value);

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
    }

    loadStatistics() {
        const gamesPlayed = settingsManager.settings.gamesPlayed;
        const bestScore = settingsManager.settings.bestScore;
        const winRate = settingsManager.getWinRate();

        document.getElementById('games-played').textContent = gamesPlayed;
        document.getElementById('best-score').textContent = bestScore;
        document.getElementById('win-rate').textContent = `${winRate}%`;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new MenuManager();
});
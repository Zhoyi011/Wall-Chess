// 设置管理器
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            // 游戏设置
            boardSize: 9,
            maxWalls: 15,
            allowUndo: true,
            maxUndoSteps: 10,
            showHints: false,
            
            // 界面设置
            soundEnabled: true,
            animationsEnabled: true,
            theme: 'default',
            language: 'zh-CN',
            
            // 游戏统计
            gamesPlayed: 0,
            gamesWon: 0,
            bestScore: 0,
            totalPlayTime: 0
        };
        
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        const savedSettings = Utils.storage.get('gameSettings');
        return { ...this.defaultSettings, ...savedSettings };
    }

    saveSettings() {
        Utils.storage.set('gameSettings', this.settings);
        this.applySettings();
    }

    applySettings() {
        // 应用主题
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        
        // 应用音效设置
        soundManager.setEnabled(this.settings.soundEnabled);
        
        // 更新CSS变量
        Utils.updateCSSVariables({
            'animation-speed': this.settings.animationsEnabled ? '1' : '0'
        });
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
    }

    incrementStat(stat, amount = 1) {
        if (this.settings[stat] !== undefined) {
            this.settings[stat] += amount;
            this.saveSettings();
        }
    }

    getWinRate() {
        if (this.settings.gamesPlayed === 0) return 0;
        return Math.round((this.settings.gamesWon / this.settings.gamesPlayed) * 100);
    }

    // 获取游戏配置
    getGameConfig(mode, players = 2, difficulty = 'medium') {
        return {
            mode: mode, // 'single' or 'multi'
            players: players,
            difficulty: difficulty,
            boardSize: this.settings.boardSize,
            maxWalls: this.settings.maxWalls,
            allowUndo: this.settings.allowUndo,
            maxUndoSteps: this.settings.maxUndoSteps,
            showHints: this.settings.showHints
        };
    }
}

// 创建全局设置管理器实例
const settingsManager = new SettingsManager();
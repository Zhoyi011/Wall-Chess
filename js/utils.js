// 工具函数模块
class Utils {
    // 防抖函数
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 深拷贝
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // 生成随机数
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 数组洗牌
    static shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // 格式化时间
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 本地存储封装
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    };

    // 事件发射器
    static createEventEmitter() {
        const events = {};
        
        return {
            on(event, callback) {
                if (!events[event]) events[event] = [];
                events[event].push(callback);
            },

            off(event, callback) {
                if (!events[event]) return;
                events[event] = events[event].filter(cb => cb !== callback);
            },

            emit(event, data) {
                if (!events[event]) return;
                events[event].forEach(callback => callback(data));
            }
        };
    }

    // 计算两点之间的距离
    static distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // 生成唯一ID
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    // 等待函数
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 验证邮箱格式
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 数字格式化
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // 创建CSS颜色变量
    static updateCSSVariables(variables) {
        const root = document.documentElement;
        Object.entries(variables).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
    }
}

// 音效管理器
class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.enabled = Utils.storage.get('soundEnabled', true);
        this.volume = Utils.storage.get('soundVolume', 0.7);
    }

    async loadSound(name, url) {
        try {
            const audio = new Audio(url);
            audio.volume = this.volume;
            this.sounds.set(name, audio);
            return true;
        } catch (error) {
            console.error(`Failed to load sound: ${name}`, error);
            return false;
        }
    }

    play(name) {
        if (!this.enabled) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {
                // 忽略自动播放错误
            });
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        Utils.storage.set('soundEnabled', enabled);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.sounds.forEach(sound => {
            sound.volume = this.volume;
        });
        Utils.storage.set('soundVolume', this.volume);
    }

    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
}

// 创建全局音效管理器实例
const soundManager = new SoundManager();

// 动画管理器
class AnimationManager {
    static async fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        await new Promise(resolve => {
            let start = null;
            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const opacity = Math.min(progress / duration, 1);
                element.style.opacity = opacity.toString();
                
                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    static async fadeOut(element, duration = 300) {
        const startOpacity = parseFloat(element.style.opacity) || 1;
        
        await new Promise(resolve => {
            let start = null;
            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const opacity = Math.max(startOpacity - (progress / duration), 0);
                element.style.opacity = opacity.toString();
                
                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    static async slideIn(element, duration = 300) {
        element.style.transform = 'translateY(-20px)';
        element.style.opacity = '0';
        element.style.display = 'block';
        
        await new Promise(resolve => {
            let start = null;
            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const percentage = Math.min(progress / duration, 1);
                
                element.style.opacity = percentage.toString();
                element.style.transform = `translateY(${-20 + (20 * percentage)}px)`;
                
                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }
}
/**
 * 深色模式功能
 * 实现网站的深色/浅色主题切换功能，支持手动切换和跟随系统设置
 */

// 主题模式常量
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';
const THEME_AUTO = 'auto';

// 存储在localStorage中的键名
const THEME_STORAGE_KEY = 'themeMode';

// 全局变量
let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || THEME_AUTO; // 默认跟随系统
let systemPrefersDark = false; // 系统是否偏好深色模式

// 初始化深色模式功能
function initDarkMode() {
  console.log('初始化深色模式功能');

  // 检测系统颜色偏好
  checkSystemColorScheme();

  // 监听系统颜色偏好变化
  listenToSystemColorScheme();

  // 初始化主题设置界面
  initThemeSettings();

  // 应用当前主题
  applyTheme(currentTheme);
}

// 检测系统颜色偏好
function checkSystemColorScheme() {
  // 检查系统是否支持深色模式
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    systemPrefersDark = true;
    console.log('系统偏好深色模式');
  } else {
    systemPrefersDark = false;
    console.log('系统偏好浅色模式');
  }
}

// 监听系统颜色偏好变化
function listenToSystemColorScheme() {
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      systemPrefersDark = e.matches;
      console.log('系统颜色偏好变化为:', systemPrefersDark ? '深色' : '浅色');
      
      // 如果当前是自动模式，则跟随系统变化
      if (currentTheme === THEME_AUTO) {
        applyTheme(THEME_AUTO);
      }
    });
  }
}

// 初始化主题设置界面
function initThemeSettings() {
  // 获取主题选择单选按钮
  const lightRadio = document.getElementById('theme-light');
  const darkRadio = document.getElementById('theme-dark');
  const autoRadio = document.getElementById('theme-auto');

  if (!lightRadio || !darkRadio || !autoRadio) {
    console.error('找不到主题设置单选按钮');
    return;
  }

  // 根据当前主题设置选中状态
  switch (currentTheme) {
    case THEME_LIGHT:
      lightRadio.checked = true;
      break;
    case THEME_DARK:
      darkRadio.checked = true;
      break;
    case THEME_AUTO:
    default:
      autoRadio.checked = true;
      break;
  }

  // 添加事件监听
  lightRadio.addEventListener('change', () => {
    if (lightRadio.checked) {
      setTheme(THEME_LIGHT);
    }
  });

  darkRadio.addEventListener('change', () => {
    if (darkRadio.checked) {
      setTheme(THEME_DARK);
    }
  });

  autoRadio.addEventListener('change', () => {
    if (autoRadio.checked) {
      setTheme(THEME_AUTO);
    }
  });

  // 将主题设置保存到设置保存按钮的事件中
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    // 保存原有的点击事件处理函数
    const originalClickHandler = saveSettingsBtn.onclick;
    
    // 添加新的事件处理函数
    saveSettingsBtn.onclick = function(event) {
      // 调用原有的事件处理函数（如果存在）
      if (typeof originalClickHandler === 'function') {
        originalClickHandler.call(this, event);
      }
      
      // 保存主题设置
      saveThemeSettings();
    };
  }

  // 将主题设置添加到重置按钮的事件中
  const resetSettingsBtn = document.getElementById('reset-settings-btn');
  if (resetSettingsBtn) {
    // 保存原有的点击事件处理函数
    const originalClickHandler = resetSettingsBtn.onclick;
    
    // 添加新的事件处理函数
    resetSettingsBtn.onclick = function(event) {
      // 调用原有的事件处理函数（如果存在）
      if (typeof originalClickHandler === 'function') {
        originalClickHandler.call(this, event);
      }
      
      // 重置主题设置为默认值（自动）
      autoRadio.checked = true;
      setTheme(THEME_AUTO);
    };
  }
}

// 保存主题设置
function saveThemeSettings() {
  // 获取当前选中的主题
  const lightRadio = document.getElementById('theme-light');
  const darkRadio = document.getElementById('theme-dark');
  
  let selectedTheme = THEME_AUTO; // 默认为自动
  
  if (lightRadio && lightRadio.checked) {
    selectedTheme = THEME_LIGHT;
  } else if (darkRadio && darkRadio.checked) {
    selectedTheme = THEME_DARK;
  }
  
  // 设置主题
  setTheme(selectedTheme);
}

// 设置主题
function setTheme(theme) {
  // 保存当前主题
  currentTheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  console.log('设置主题为:', currentTheme);
  
  // 应用主题
  applyTheme(currentTheme);
}

// 应用主题
function applyTheme(theme) {
  // 根据主题模式决定是否应用深色模式
  let shouldApplyDark = false;
  
  switch (theme) {
    case THEME_LIGHT:
      shouldApplyDark = false;
      break;
    case THEME_DARK:
      shouldApplyDark = true;
      break;
    case THEME_AUTO:
    default:
      shouldApplyDark = systemPrefersDark;
      break;
  }
  
  // 应用或移除深色模式类
  if (shouldApplyDark) {
    document.documentElement.classList.add('dark-mode');
    console.log('应用深色模式');
  } else {
    document.documentElement.classList.remove('dark-mode');
    console.log('应用浅色模式');
  }

  // 更新地图样式（如果地图已初始化）
  updateMapStyle(shouldApplyDark);
}

// 更新地图样式
function updateMapStyle(isDark) {
  // 检查地图是否已初始化
  if (typeof map !== 'undefined' && map) {
    // 获取当前地图图层
    const currentLayer = map.hasLayer(osmLayer) ? 'osm' : 
                         map.hasLayer(osmHOTLayer) ? 'osmHOT' : 
                         map.hasLayer(cartoDBLayer) ? 'cartoDB' : 
                         'unknown';
    
    // 如果是深色模式，切换到深色地图图层
    if (isDark) {
      // 移除当前图层
      if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
      if (map.hasLayer(osmHOTLayer)) map.removeLayer(osmHOTLayer);
      if (map.hasLayer(cartoDBLayer)) map.removeLayer(cartoDBLayer);
      
      // 添加深色图层 - 使用CartoDB Dark Matter
      if (typeof cartoDBDarkLayer !== 'undefined') {
        map.addLayer(cartoDBDarkLayer);
      } else if (typeof L !== 'undefined') {
        // 如果深色图层未定义，创建一个
        window.cartoDBDarkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);
      }
    } else {
      // 浅色模式，恢复原来的图层
      // 移除深色图层（如果存在）
      if (typeof cartoDBDarkLayer !== 'undefined' && map.hasLayer(cartoDBDarkLayer)) {
        map.removeLayer(cartoDBDarkLayer);
      }
      
      // 恢复原来的图层
      switch (currentLayer) {
        case 'osm':
          if (typeof osmLayer !== 'undefined') map.addLayer(osmLayer);
          break;
        case 'osmHOT':
          if (typeof osmHOTLayer !== 'undefined') map.addLayer(osmHOTLayer);
          break;
        case 'cartoDB':
          if (typeof cartoDBLayer !== 'undefined') map.addLayer(cartoDBLayer);
          break;
        default:
          // 如果无法确定原来的图层，默认使用OSM Humanitarian
          if (typeof osmHOTLayer !== 'undefined') {
            map.addLayer(osmHOTLayer);
          } else if (typeof L !== 'undefined') {
            window.osmHOTLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
              maxZoom: 19
            }).addTo(map);
          }
          break;
      }
    }
  }
}

// 在页面加载完成后初始化深色模式功能
document.addEventListener('DOMContentLoaded', initDarkMode);

// 导出函数供其他脚本调用
window.setTheme = setTheme;
window.getCurrentTheme = () => currentTheme;
window.isSystemDarkMode = () => systemPrefersDark;

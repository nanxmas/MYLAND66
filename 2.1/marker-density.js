// 标记点密度过滤模块

// 全局变量
let markerDensityFilterEnabled = localStorage.getItem('markerDensityFilterEnabled') !== 'false'; // 默认开启
let markerDensityFilterIntensity = parseInt(localStorage.getItem('markerDensityFilterIntensity') || '50'); // 默认中等强度 (0-100)
let gridSize = 50; // 网格大小（像素），会根据过滤强度动态调整

// 初始化密度过滤功能
function initMarkerDensityFilter() {
  // 从localStorage加载设置
  loadDensityFilterSettings();
  
  // 添加设置选项
  addDensityFilterSettings();
  
  console.log('标记点密度过滤功能已初始化', {
    enabled: markerDensityFilterEnabled,
    intensity: markerDensityFilterIntensity
  });
}

// 加载密度过滤设置
function loadDensityFilterSettings() {
  markerDensityFilterEnabled = localStorage.getItem('markerDensityFilterEnabled') !== 'false';
  markerDensityFilterIntensity = parseInt(localStorage.getItem('markerDensityFilterIntensity') || '50');
  
  // 确保强度值在有效范围内
  if (isNaN(markerDensityFilterIntensity) || markerDensityFilterIntensity < 0) {
    markerDensityFilterIntensity = 0;
  } else if (markerDensityFilterIntensity > 100) {
    markerDensityFilterIntensity = 100;
  }
  
  // 根据强度计算网格大小
  updateGridSize();
}

// 更新网格大小
function updateGridSize() {
  // 网格大小范围：20px（最低强度）到 100px（最高强度）
  gridSize = 100 - markerDensityFilterIntensity * 0.8;
  if (gridSize < 20) gridSize = 20;
  if (gridSize > 100) gridSize = 100;
}

// 添加密度过滤设置到设置面板
function addDensityFilterSettings() {
  // 获取设置面板
  const settingsPanel = document.querySelector('#settings-panel .d-grid.gap-2');
  if (!settingsPanel) return;
  
  // 创建设置选项容器
  const settingContainer = document.createElement('div');
  settingContainer.className = 'marker-density-settings mb-3';
  
  // 创建开关设置
  const switchDiv = document.createElement('div');
  switchDiv.className = 'form-check form-switch mb-2';
  switchDiv.innerHTML = `
    <input class="form-check-input" type="checkbox" id="marker-density-switch" ${markerDensityFilterEnabled ? 'checked' : ''}>
    <label class="form-check-label" for="marker-density-switch">启用标记点密度过滤</label>
    <div class="form-text">在地图缩小时自动过滤密集区域的标记点，减少渲染负担</div>
  `;
  
  // 创建强度滑块设置
  const sliderDiv = document.createElement('div');
  sliderDiv.className = 'mb-3';
  sliderDiv.innerHTML = `
    <label for="marker-density-intensity" class="form-label">过滤强度: <span id="intensity-value">${markerDensityFilterIntensity}%</span></label>
    <input type="range" class="form-range" id="marker-density-intensity" min="0" max="100" step="5" value="${markerDensityFilterIntensity}">
    <div class="form-text">较高的强度可以减少更多标记点，提高性能</div>
  `;
  
  // 将设置添加到容器
  settingContainer.appendChild(switchDiv);
  settingContainer.appendChild(sliderDiv);
  
  // 插入到保存按钮之前
  settingsPanel.insertBefore(settingContainer, settingsPanel.querySelector('button#save-settings-btn'));
  
  // 绑定事件
  const switchElement = document.getElementById('marker-density-switch');
  const sliderElement = document.getElementById('marker-density-intensity');
  const intensityValueElement = document.getElementById('intensity-value');
  
  // 开关事件
  switchElement.addEventListener('change', function() {
    markerDensityFilterEnabled = this.checked;
    localStorage.setItem('markerDensityFilterEnabled', markerDensityFilterEnabled);
    
    // 更新地图标记点
    if (typeof updateVisibleMarkers === 'function') {
      updateVisibleMarkers();
    }
  });
  
  // 滑块事件
  sliderElement.addEventListener('input', function() {
    markerDensityFilterIntensity = parseInt(this.value);
    intensityValueElement.textContent = `${markerDensityFilterIntensity}%`;
  });
  
  sliderElement.addEventListener('change', function() {
    localStorage.setItem('markerDensityFilterIntensity', markerDensityFilterIntensity);
    updateGridSize();
    
    // 更新地图标记点
    if (typeof updateVisibleMarkers === 'function') {
      updateVisibleMarkers();
    }
  });
}

// 应用密度过滤算法
function applyDensityFilter(points, zoom) {
  // 如果功能被禁用或缩放级别足够大，返回所有点
  if (!markerDensityFilterEnabled || zoom >= 15) {
    return points;
  }
  
  // 根据缩放级别调整过滤强度
  // 缩放级别越小，过滤越强
  const zoomFactor = Math.max(0, (zoom - 10) / 5); // 10-15级缩放范围内线性调整
  const effectiveGridSize = gridSize * (1 - zoomFactor * 0.8); // 随着放大，网格变小
  
  // 创建网格
  const grid = {};
  const filteredPoints = [];
  
  // 将点分配到网格
  points.forEach(point => {
    if (!point.geo || point.geo.length !== 2) return;
    
    // 将地理坐标转换为像素坐标
    const pixelPoint = map.latLngToContainerPoint([point.geo[0], point.geo[1]]);
    const gridX = Math.floor(pixelPoint.x / effectiveGridSize);
    const gridY = Math.floor(pixelPoint.y / effectiveGridSize);
    const gridKey = `${gridX},${gridY}`;
    
    // 如果网格中还没有点，添加这个点
    if (!grid[gridKey]) {
      grid[gridKey] = true;
      filteredPoints.push(point);
    }
  });
  
  console.log(`密度过滤: ${points.length} 个点减少到 ${filteredPoints.length} 个点 (${Math.round(filteredPoints.length / points.length * 100)}%)`);
  
  return filteredPoints;
}

// 导出函数供主脚本调用
window.initMarkerDensityFilter = initMarkerDensityFilter;
window.applyDensityFilter = applyDensityFilter;

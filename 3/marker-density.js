// 标记点密度过滤模块

// 全局变量
let markerDensityFilterEnabled = localStorage.getItem('markerDensityFilterEnabled') !== 'false'; // 默认开启
let markerDensityFilterIntensity = parseInt(localStorage.getItem('markerDensityFilterIntensity') || '95'); // 默认高强度 (0-100)
let gridSize = 190; // 网格大小（像素），会根据过滤强度动态调整

// 初始化密度过滤功能
function initMarkerDensityFilter() {
  // 从localStorage加载设置
  loadDensityFilterSettings();

  // 确保默认设置保存到本地存储
  if (!localStorage.getItem('markerDensityFilterIntensity')) {
    localStorage.setItem('markerDensityFilterIntensity', '95');
  }
  if (localStorage.getItem('markerDensityFilterEnabled') === null) {
    localStorage.setItem('markerDensityFilterEnabled', 'true');
  }

  // 添加设置选项
  addDensityFilterSettings();

  // 标记点密度过滤功能已初始化
}

// 加载密度过滤设置
function loadDensityFilterSettings() {
  markerDensityFilterEnabled = localStorage.getItem('markerDensityFilterEnabled') !== 'false';
  markerDensityFilterIntensity = parseInt(localStorage.getItem('markerDensityFilterIntensity') || '95');

  // 确保强度值在有效范围内
  if (isNaN(markerDensityFilterIntensity) || markerDensityFilterIntensity < 0) {
    markerDensityFilterIntensity = 95; // 默认使用高强度
  } else if (markerDensityFilterIntensity > 100) {
    markerDensityFilterIntensity = 100;
  }

  // 根据强度计算网格大小
  updateGridSize();
}

// 更新网格大小
function updateGridSize() {
  // 网格大小范围：20px（最低强度）到 200px（最高强度）
  // 强度越高，网格越大，显示的点越少
  // 使用非线性计算，在高强度时增长更快
  if (markerDensityFilterIntensity <= 50) {
    // 0-50范围内线性增长
    gridSize = 20 + markerDensityFilterIntensity * 1.6; // 20-100px
  } else {
    // 50-100范围内非线性增长，增长更快
    const baseSize = 100; // 50%强度时的基础大小
    const extraIntensity = markerDensityFilterIntensity - 50; // 超过50%的部分
    gridSize = baseSize + extraIntensity * 2; // 超过50%后，每1%增加2px
  }

  // 确保网格大小在合理范围内
  if (gridSize < 20) gridSize = 20;
  if (gridSize > 200) gridSize = 200; // 增加最大网格大小到200px
}

// 添加密度过滤设置到设置面板
function addDensityFilterSettings() {
  // 获取设置面板中的标记点设置容器
  const settingsContainer = document.querySelector('#map-settings .marker-density-settings');
  if (!settingsContainer) return;

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
    <div class="form-text">较高的强度会减少更多标记点，提高性能（超过50%后过滤效果增强）</div>
  `;

  // 测试按钮已移除

  // 将设置添加到容器
  settingsContainer.appendChild(switchDiv);
  settingsContainer.appendChild(sliderDiv);

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

  // 滑块事件 - 实时更新
  sliderElement.addEventListener('input', function() {
    markerDensityFilterIntensity = parseInt(this.value);
    intensityValueElement.textContent = `${markerDensityFilterIntensity}%`;

    // 实时更新网格大小
    updateGridSize();

    // 实时更新地图标记点
    if (typeof window.updateVisibleMarkers === 'function') {
      // 使用延迟执行，避免频繁更新
      if (window.densityFilterDebounceTimer) {
        clearTimeout(window.densityFilterDebounceTimer);
      }
      window.densityFilterDebounceTimer = setTimeout(() => {
        window.updateVisibleMarkers();
      }, 100);
    }
  });

  sliderElement.addEventListener('change', function() {
    // 保存设置到本地存储
    localStorage.setItem('markerDensityFilterIntensity', markerDensityFilterIntensity);

    // 确保网格大小已更新
    updateGridSize();

    // 最终更新地图标记点
    if (typeof window.updateVisibleMarkers === 'function') {
      if (window.densityFilterDebounceTimer) {
        clearTimeout(window.densityFilterDebounceTimer);
      }
      window.updateVisibleMarkers();
    }
  });

  // 测试按钮事件处理程序已移除
}

// 应用密度过滤算法
function applyDensityFilter(points, zoom) {
  // 如果功能被禁用，返回所有点
  if (!markerDensityFilterEnabled) {
    return points;
  }

  // 在高缩放级别时的过滤逻辑
  // 当缩放级别足够大时，根据强度决定是否过滤
  if (zoom >= 15) {
    // 在高缩放级别时，只有当强度超过70%时才进行过滤
    if (markerDensityFilterIntensity < 70) {
      return points;
    } else {
      // 在高缩放级别下，增强过滤效果
      // 将强度提高到至少90%，以确保在高缩放级别下也能有效过滤
      const boostedIntensity = Math.min(100, markerDensityFilterIntensity + 20);
      // 使用提高后的强度重新计算网格大小
      let tempGridSize;
      if (boostedIntensity <= 50) {
        tempGridSize = 20 + boostedIntensity * 1.6;
      } else {
        const baseSize = 100;
        const extraIntensity = boostedIntensity - 50;
        tempGridSize = baseSize + extraIntensity * 2;
      }
      if (tempGridSize < 20) tempGridSize = 20;
      if (tempGridSize > 200) tempGridSize = 200;

      // 使用临时网格大小进行过滤
      const originalGridSize = gridSize;
      gridSize = tempGridSize;
      // 在函数结束前恢复原始网格大小
      setTimeout(() => { gridSize = originalGridSize; }, 0);
    }
  }

  // 根据缩放级别调整过滤强度
  // 缩放级别越小，过滤越强
  const zoomFactor = Math.max(0, (zoom - 6) / 9); // 6-15级缩放范围内线性调整

  // 随着缩放级别增加，减小网格大小，显示更多点
  // 当缩放级别足够大时，网格变小，显示更多点
  const effectiveGridSize = gridSize * (1 - zoomFactor * 0.8);

  // 创建网格
  const grid = {};
  const filteredPoints = [];

  // 检查地图对象是否可用
  if (!window.map) {
    console.error('地图对象不可用，无法进行密度过滤');
    return points;
  }

  // 将点分配到网格
  points.forEach(point => {
    if (!point.geo || point.geo.length !== 2) return;

    try {
      // 将地理坐标转换为像素坐标
      const pixelPoint = window.map.latLngToContainerPoint([point.geo[0], point.geo[1]]);
      const gridX = Math.floor(pixelPoint.x / effectiveGridSize);
      const gridY = Math.floor(pixelPoint.y / effectiveGridSize);
      const gridKey = `${gridX},${gridY}`;

      // 如果网格中还没有点，添加这个点
      if (!grid[gridKey]) {
        grid[gridKey] = true;
        filteredPoints.push(point);
      }
    } catch (error) {
      console.error('处理点时出错：', error);
      filteredPoints.push(point); // 出错时保留原始点
    }
  });

  // 计算过滤率（不再输出到控制台）
  // const filterRate = points.length > 0 ? 100 - (filteredPoints.length / points.length * 100) : 0;

  return filteredPoints;
}

// 导出函数供主脚本调用
window.initMarkerDensityFilter = initMarkerDensityFilter;
window.applyDensityFilter = applyDensityFilter;

// 标记点聚合模块

// 全局变量
// 标记点显示模式: 'default'(默认所有点模式), 'cluster'(聚合点模式), 'smart'(智能模式)
let markerDisplayMode = localStorage.getItem('markerDisplayMode') || 'default'; // 默认使用所有点模式
let markerClusterDistance = parseInt(localStorage.getItem('markerClusterDistance') || '80'); // 默认聚合距离
let markerClusterMaxZoom = parseInt(localStorage.getItem('markerClusterMaxZoom') || '15'); // 默认最大聚合缩放级别
let markerClusterGroup; // 聚合图层组

// 密集区域坐标范围，用于智能模式
const denseCityAreas = [
  // 东京及周边地区
  { name: '东京', bounds: [[35.4981, 139.2773], [35.9009, 139.9707]] },
  // 大阪地区
  { name: '大阪', bounds: [[34.5731, 135.3831], [34.7691, 135.5881]] },
  // 京都地区
  { name: '京都', bounds: [[34.9487, 135.6461], [35.1187, 135.8511]] },
  // 名古屋地区
  { name: '名古屋', bounds: [[35.0751, 136.8066], [35.2711, 137.0116]] },
  // 北海道札幌地区
  { name: '札幌', bounds: [[42.9751, 141.2461], [43.1711, 141.4511]] }
]

// 初始化标记点聚合功能
function initMarkerCluster() {
  // 确保默认设置保存到本地存储
  if (!localStorage.getItem('markerDisplayMode')) {
    localStorage.setItem('markerDisplayMode', 'default');
  }

  // 从localStorage加载设置
  loadClusterSettings();

  // 添加设置选项
  addClusterSettings();

  // 创建聚合图层组
  createClusterGroup();

  // 标记点聚合功能已初始化
}

// 加载聚合设置
function loadClusterSettings() {
  markerDisplayMode = localStorage.getItem('markerDisplayMode') || 'default';
  markerClusterDistance = parseInt(localStorage.getItem('markerClusterDistance') || '80');
  markerClusterMaxZoom = parseInt(localStorage.getItem('markerClusterMaxZoom') || '15');

  // 确保模式值有效
  if (!['default', 'cluster', 'smart'].includes(markerDisplayMode)) {
    markerDisplayMode = 'default';
  }

  // 确保值在有效范围内
  if (isNaN(markerClusterDistance) || markerClusterDistance < 10) {
    markerClusterDistance = 10;
  } else if (markerClusterDistance > 200) {
    markerClusterDistance = 200;
  }

  if (isNaN(markerClusterMaxZoom) || markerClusterMaxZoom < 10) {
    markerClusterMaxZoom = 10;
  } else if (markerClusterMaxZoom > 18) {
    markerClusterMaxZoom = 18;
  }
}

// 创建聚合图层组
function createClusterGroup() {
  // 如果已存在，先移除
  if (markerClusterGroup && map) {
    map.removeLayer(markerClusterGroup);
  }

  // 如果模式是默认所有点模式，不创建聚合图层
  if (markerDisplayMode === 'default') {
    markerClusterGroup = null;
    return;
  }

  // 创建聚合图层组，并配置参数
  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: markerClusterDistance, // 聚合半径
    disableClusteringAtZoom: markerClusterMaxZoom, // 在此缩放级别及以上禁用聚合
    spiderfyOnMaxZoom: true, // 在最大缩放级别时展开聚合
    showCoverageOnHover: false, // 不显示聚合覆盖范围
    zoomToBoundsOnClick: true, // 点击聚合时缩放到边界
    animate: true, // 启用动画
    animateAddingMarkers: true, // 添加标记时启用动画
    iconCreateFunction: createCustomClusterIcon, // 自定义聚合图标
    chunkedLoading: true, // 分块加载，提高性能
    chunkInterval: 100, // 分块间隔时间
    chunkDelay: 50 // 分块延迟时间
  });

  // 添加到地图
  if (map) {
    map.addLayer(markerClusterGroup);
  }
}

// 自定义聚合图标
function createCustomClusterIcon(cluster) {
  const count = cluster.getChildCount();
  let size, className;

  // 根据聚合点数量确定图标大小和样式
  if (count < 10) {
    size = 30;
    className = 'marker-cluster-small';
  } else if (count < 100) {
    size = 40;
    className = 'marker-cluster-medium';
  } else {
    size = 50;
    className = 'marker-cluster-large';
  }

  // 创建自定义HTML
  return L.divIcon({
    html: `<div><span>${count}</span></div>`,
    className: `marker-cluster ${className}`,
    iconSize: new L.Point(size, size)
  });
}

// 添加聚合设置到设置面板
function addClusterSettings() {
  // 获取设置面板中的标记点设置容器
  const settingsContainer = document.querySelector('#map-settings .marker-cluster-settings');
  if (!settingsContainer) return;

  // 创建标记点显示模式选择
  const modeDiv = document.createElement('div');
  modeDiv.className = 'mb-3';
  modeDiv.innerHTML = `
    <label class="form-label">标记点显示模式</label>
    <div class="form-text mb-2">选择地图上标记点的显示方式</div>
    <div class="btn-group w-100" role="group" aria-label="标记点显示模式">
      <input type="radio" class="btn-check" name="marker-display-mode" id="mode-default" value="default" ${markerDisplayMode === 'default' ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="mode-default">默认所有点</label>

      <input type="radio" class="btn-check" name="marker-display-mode" id="mode-cluster" value="cluster" ${markerDisplayMode === 'cluster' ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="mode-cluster">聚合点</label>

      <input type="radio" class="btn-check" name="marker-display-mode" id="mode-smart" value="smart" ${markerDisplayMode === 'smart' ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="mode-smart">智能模式</label>
    </div>
    <div class="form-text mt-1">智能模式将在密集区域使用聚合，在稀疏区域显示所有点</div>
  `;

  // 创建聚合距离滑块设置
  const distanceSliderDiv = document.createElement('div');
  distanceSliderDiv.className = 'mb-3';
  distanceSliderDiv.innerHTML = `
    <label for="marker-cluster-distance" class="form-label">聚合距离: <span id="distance-value">${markerClusterDistance}px</span></label>
    <input type="range" class="form-range" id="marker-cluster-distance" min="10" max="200" step="10" value="${markerClusterDistance}">
    <div class="form-text">较大的距离会聚合更多标记点，提高性能</div>
  `;

  // 创建最大聚合缩放级别滑块设置
  const maxZoomSliderDiv = document.createElement('div');
  maxZoomSliderDiv.className = 'mb-3';
  maxZoomSliderDiv.innerHTML = `
    <label for="marker-cluster-max-zoom" class="form-label">最大聚合缩放级别: <span id="max-zoom-value">${markerClusterMaxZoom}</span></label>
    <input type="range" class="form-range" id="marker-cluster-max-zoom" min="10" max="18" step="1" value="${markerClusterMaxZoom}">
    <div class="form-text">在此缩放级别及以上将不再聚合标记点</div>
  `;

  // 将设置添加到容器
  settingsContainer.appendChild(modeDiv);
  settingsContainer.appendChild(distanceSliderDiv);
  settingsContainer.appendChild(maxZoomSliderDiv);

  // 绑定事件
  const modeRadios = document.querySelectorAll('input[name="marker-display-mode"]');
  const distanceSliderElement = document.getElementById('marker-cluster-distance');
  const maxZoomSliderElement = document.getElementById('marker-cluster-max-zoom');
  const distanceValueElement = document.getElementById('distance-value');
  const maxZoomValueElement = document.getElementById('max-zoom-value');

  // 根据当前模式设置滑块的启用/禁用状态
  const isClusteringEnabled = markerDisplayMode !== 'default';
  distanceSliderElement.disabled = !isClusteringEnabled;
  maxZoomSliderElement.disabled = !isClusteringEnabled;

  // 模式选择事件
  modeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
        markerDisplayMode = this.value;
        localStorage.setItem('markerDisplayMode', markerDisplayMode);

        // 更新滑块的启用/禁用状态
        const isClusteringEnabled = markerDisplayMode !== 'default';
        distanceSliderElement.disabled = !isClusteringEnabled;
        maxZoomSliderElement.disabled = !isClusteringEnabled;

        // 重新创建聚合图层
        createClusterGroup();

        // 更新地图标记点
        if (typeof updateVisibleMarkers === 'function') {
          updateVisibleMarkers();
        }
      }
    });
  });

  // 聚合距离滑块事件
  distanceSliderElement.addEventListener('input', function() {
    markerClusterDistance = parseInt(this.value);
    distanceValueElement.textContent = `${markerClusterDistance}px`;
  });

  distanceSliderElement.addEventListener('change', function() {
    localStorage.setItem('markerClusterDistance', markerClusterDistance);

    // 重新创建聚合图层
    createClusterGroup();

    // 更新地图标记点
    if (typeof updateVisibleMarkers === 'function') {
      updateVisibleMarkers();
    }
  });

  // 最大聚合缩放级别滑块事件
  maxZoomSliderElement.addEventListener('input', function() {
    markerClusterMaxZoom = parseInt(this.value);
    maxZoomValueElement.textContent = markerClusterMaxZoom;
  });

  maxZoomSliderElement.addEventListener('change', function() {
    localStorage.setItem('markerClusterMaxZoom', markerClusterMaxZoom);

    // 重新创建聚合图层
    createClusterGroup();

    // 更新地图标记点
    if (typeof updateVisibleMarkers === 'function') {
      updateVisibleMarkers();
    }
  });
}

// 添加标记点到聚合图层
function addMarkerToCluster(marker) {
  // 如果模式是默认所有点模式，直接添加到地图
  if (markerDisplayMode === 'default') {
    marker.addTo(map);
    return marker;
  }

  // 如果模式是智能模式，检查点是否在密集区域
  if (markerDisplayMode === 'smart' && marker.pointData && marker.pointData.point && marker.pointData.point.geo) {
    const [lat, lng] = marker.pointData.point.geo;
    const isInDenseArea = isPointInDenseArea(lat, lng);

    // 如果不在密集区域，直接添加到地图
    if (!isInDenseArea) {
      marker.addTo(map);
      return marker;
    }
  }

  // 如果聚合图层不存在，直接添加到地图
  if (!markerClusterGroup) {
    marker.addTo(map);
    return marker;
  }

  // 添加到聚合图层
  markerClusterGroup.addLayer(marker);

  // 确保标记点不会同时添加到地图和聚合图层
  if (marker._map === map) {
    map.removeLayer(marker);
  }

  return marker;
}

// 检查点是否在密集区域
function isPointInDenseArea(lat, lng) {
  for (const area of denseCityAreas) {
    const [[minLat, minLng], [maxLat, maxLng]] = area.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return true;
    }
  }
  return false;
}

// 从聚合图层移除标记点
function removeMarkerFromCluster(marker) {
  // 如果模式是默认所有点模式或聚合图层不存在，直接从地图移除
  if (markerDisplayMode === 'default' || !markerClusterGroup) {
    if (marker._map === map) {
      map.removeLayer(marker);
    }
    return;
  }

  // 如果是智能模式，检查点是否在密集区域
  if (markerDisplayMode === 'smart' && marker.pointData && marker.pointData.point && marker.pointData.point.geo) {
    const [lat, lng] = marker.pointData.point.geo;
    const isInDenseArea = isPointInDenseArea(lat, lng);

    // 如果不在密集区域，直接从地图移除
    if (!isInDenseArea) {
      if (marker._map === map) {
        map.removeLayer(marker);
      }
      return;
    }
  }

  // 从聚合图层移除
  markerClusterGroup.removeLayer(marker);
}

// 清空聚合图层
function clearClusterGroup() {
  if (markerClusterGroup) {
    markerClusterGroup.clearLayers();
  }
}

// 导出函数供主脚本调用
window.initMarkerCluster = initMarkerCluster;
window.addMarkerToCluster = addMarkerToCluster;
window.removeMarkerFromCluster = removeMarkerFromCluster;
window.clearClusterGroup = clearClusterGroup;

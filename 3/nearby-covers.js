// 附近巡礼点封面显示功能

// 全局变量
let nearbyCoverEnabled = localStorage.getItem('nearbyCoverEnabled') !== 'false'; // 默认开启
let nearbyCoverContainer = null;
let visibleNearbyCovers = new Map(); // 存储当前显示的封面
let targetZoomLevel = 6; // 目标缩放级别，当地图放大到倒数第6级或更大时显示

// 初始化附近巡礼点封面功能
function initNearbyCovers() {
  // 创建封面容器
  nearbyCoverContainer = document.createElement('div');
  nearbyCoverContainer.className = 'nearby-covers-container';
  nearbyCoverContainer.style.display = nearbyCoverEnabled ? 'flex' : 'none';
  document.getElementById('map').appendChild(nearbyCoverContainer);

  // 监听地图缩放事件
  map.on('zoomend', updateNearbyCovers);
  map.on('moveend', updateNearbyCovers);

  // 添加设置选项
  addNearbyCoverSetting();
}

// 更新附近巡礼点封面
function updateNearbyCovers() {
  // 如果功能未启用，不显示封面
  if (!nearbyCoverEnabled) {
    nearbyCoverContainer.style.display = 'none';
    return;
  }

  // 获取当前地图缩放级别
  const currentZoom = map.getZoom();

  // 只有在目标缩放级别及以上才显示封面
  if (currentZoom >= targetZoomLevel) {
    nearbyCoverContainer.style.display = 'flex';
    showNearbyCovers();
  } else {
    nearbyCoverContainer.style.display = 'none';
    clearNearbyCovers();
  }
}

// 显示附近巡礼点封面
async function showNearbyCovers() {
  // 清空现有封面
  clearNearbyCovers();

  // 获取地图中心点和可视区域
  const center = map.getCenter();
  const bounds = map.getBounds();

  // 存储附近的巡礼点，按动漫分组
  const nearbyAnimes = new Map();

  // 遍历所有可见的标记点
  visibleMarkers.forEach((marker, markerId) => {
    const pointData = marker.pointData;
    if (!pointData || !pointData.anime || !pointData.anime.cover) return;

    const animeId = pointData.animeId;
    const anime = pointData.anime;
    const point = pointData.point;

    // 如果这个动漫已经在列表中，添加到现有条目
    if (nearbyAnimes.has(animeId)) {
      nearbyAnimes.get(animeId).points.push({
        point: point,
        marker: marker
      });
    } else {
      // 否则创建新条目
      nearbyAnimes.set(animeId, {
        anime: anime,
        animeId: animeId,
        cover: anime.cover,
        points: [{
          point: point,
          marker: marker
        }]
      });
    }
  });

  // 按照距离中心点的距离排序
  const sortedAnimes = Array.from(nearbyAnimes.values()).sort((a, b) => {
    // 计算每个动漫的第一个点到中心的距离
    const distA = getDistance(a.points[0].point.geo, [center.lat, center.lng]);
    const distB = getDistance(b.points[0].point.geo, [center.lat, center.lng]);
    return distA - distB;
  });

  // 最多显示5个动漫封面
  const limitedAnimes = sortedAnimes.slice(0, 5);

  // 创建封面元素
  limitedAnimes.forEach(animeData => {
    createCoverElement(animeData);
  });
}

// 创建封面元素
function createCoverElement(animeData) {
  const coverItem = document.createElement('div');
  coverItem.className = 'nearby-cover-item';
  coverItem.style.backgroundImage = `url('${updateImageUrl(animeData.cover)}')`;
  coverItem.setAttribute('data-anime-id', animeData.animeId);

  // 如果有多个巡礼点，显示数量徽章
  if (animeData.points.length > 1) {
    const badge = document.createElement('div');
    badge.className = 'nearby-cover-badge';
    badge.textContent = animeData.points.length;
    coverItem.appendChild(badge);
  }

  // 点击封面时的事件处理
  coverItem.addEventListener('click', () => {
    handleCoverClick(animeData);
  });

  // 添加到容器
  nearbyCoverContainer.appendChild(coverItem);

  // 存储到可见封面Map中
  visibleNearbyCovers.set(animeData.animeId, {
    element: coverItem,
    data: animeData
  });
}

// 处理封面点击事件
function handleCoverClick(animeData) {
  // 如果只有一个巡礼点，直接显示信息卡片
  if (animeData.points.length === 1) {
    const pointData = animeData.points[0];
    showPointInfo(pointData.point, animeData.anime, animeData.animeId);

    // 将地图中心移动到该点
    map.setView([pointData.point.geo[0], pointData.point.geo[1]], map.getZoom());
  } else {
    // 如果有多个巡礼点，将地图上的标记点替换为带封面的小图标
    animeData.points.forEach(pointData => {
      // 移除原来的标记
      map.removeLayer(pointData.marker);

      // 创建带有番剧封面的小标记
      const icon = L.divIcon({
        className: 'anime-marker-small',
        html: `<div style="width: 25px; height: 25px; background-image: url('${updateImageUrl(animeData.cover)}'); background-size: cover; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [25, 25],
        iconAnchor: [12.5, 12.5]
      });

      const newMarker = L.marker([pointData.point.geo[0], pointData.point.geo[1]], { icon });

      // 存储点信息
      newMarker.pointData = pointData.marker.pointData;

      // 绑定点击事件
      newMarker.on('click', () => {
        // 直接显示信息卡片，不等待图片加载
        showPointInfo(pointData.point, animeData.anime, animeData.animeId);
      });

      // 添加到地图
      newMarker.addTo(map);

      // 更新标记点引用
      const markerId = `${animeData.animeId}-${pointData.point.geo[0]}-${pointData.point.geo[1]}`;
      visibleMarkers.set(markerId, newMarker);

      // 替换markers数组中的标记
      const index = markers.indexOf(pointData.marker);
      if (index > -1) {
        markers[index] = newMarker;
      } else {
        markers.push(newMarker);
      }
    });

    // 调整地图视图以显示所有点
    const bounds = animeData.points.map(p => [p.point.geo[0], p.point.geo[1]]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  // 高亮显示当前选中的封面
  visibleNearbyCovers.forEach((cover, id) => {
    if (id === animeData.animeId) {
      cover.element.classList.add('active');
    } else {
      cover.element.classList.remove('active');
    }
  });
}

// 清空附近巡礼点封面
function clearNearbyCovers() {
  if (nearbyCoverContainer) {
    nearbyCoverContainer.innerHTML = '';
  }
  visibleNearbyCovers.clear();
}

// 计算两点之间的距离（简化版，仅用于排序）
function getDistance(point1, point2) {
  const dx = point1[0] - point2[0];
  const dy = point1[1] - point2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// 添加设置选项
function addNearbyCoverSetting() {
  // 获取设置面板中的标记点设置容器
  const settingsContainer = document.querySelector('#map-settings .nearby-cover-settings');
  if (!settingsContainer) return;

  // 创建设置选项
  const settingDiv = document.createElement('div');
  settingDiv.className = 'form-check form-switch mb-3';
  settingDiv.innerHTML = `
    <input class="form-check-input" type="checkbox" id="nearby-cover-switch" ${nearbyCoverEnabled ? 'checked' : ''}>
    <label class="form-check-label" for="nearby-cover-switch">显示附近巡礼点封面</label>
    <div class="form-text">在地图放大到一定级别时，在左上角显示附近巡礼点的动漫封面</div>
  `;

  // 添加到容器
  settingsContainer.appendChild(settingDiv);

  // 绑定切换事件
  const switchElement = document.getElementById('nearby-cover-switch');
  switchElement.addEventListener('change', function() {
    nearbyCoverEnabled = this.checked;
    localStorage.setItem('nearbyCoverEnabled', nearbyCoverEnabled);
    updateNearbyCovers();
  });
}

// 导出函数供主脚本调用
window.initNearbyCovers = initNearbyCovers;
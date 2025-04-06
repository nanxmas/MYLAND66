// 全局变量
let map;
let allAnimeData = {};
let markers = [];
let currentMode = 'all'; // 当前模式：all, single, guide
let currentAnime = null; // 当前选中的番剧
let currentGuide = null; // 当前选中的指南
let visibleMarkers = new Map(); // 存储可见区域内的标记点
let imageCache = new Map(); // 图片缓存
let imageCacheQueue = []; // 图片缓存队列，用于LRU策略
const MAX_CACHE_SIZE = 50; // 最大缓存图片数量
let imageLoadQueue = []; // 图片加载队列
let isMapMoving = false; // 地图是否正在移动中
let debounceTimer = null; // 用于防抖的定时器
let imageCleanupTimer = null; // 图片清理定时器

// 番剧列表分页相关变量
let currentPage = 1; // 当前页码
const PAGE_SIZE = 20; // 每页显示的番剧数量
let isLoading = false; // 是否正在加载更多番剧
let hasMoreAnimes = true; // 是否还有更多番剧可加载
let currentFilter = ''; // 当前搜索过滤条件

// DOM 元素
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const animeList = document.getElementById('anime-list');
const infoCard = document.getElementById('info-card');
const closeInfoBtn = document.getElementById('close-info');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.getElementById('sidebar');

// 模式切换按钮
const modeAllBtn = document.getElementById('mode-all');
const modeSingleBtn = document.getElementById('mode-single');
const modeGuideBtn = document.getElementById('mode-guide');

// 初始化函数
async function init() {
  showLoader();
  try {
    // 初始化地图
    initMap();
    
    // 加载番剧数据
    await loadAnimeData();
    
    // 渲染番剧列表
    renderAnimeList();
    
    // 添加所有标记点（现在是异步的）
    await addAllMarkers();
    
    // 绑定事件
    bindEvents();
    
    // 启动图片生命周期管理
    startImageLifecycleManagement();
    
    console.log('初始化完成，已启用懒加载模式');
  } catch (error) {
    console.error('初始化失败:', error);
    alert('加载数据失败，请刷新页面重试');
  } finally {
    hideLoader();
  }
}

// 初始化地图
function initMap() {
  // 创建地图，初始中心设在日本
  map = L.map('map').setView([35.6762, 139.6503], 6);
  
  // 添加地图图层
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  // 添加地图移动和缩放事件监听
  map.on('movestart', () => {
    isMapMoving = true;
  });
  
  map.on('moveend', () => {
    isMapMoving = false;
    updateVisibleMarkers();
    // 地图停止移动后，优先加载视口内的图片并清理不可见图片
    prioritizeVisibleImages();
    cleanupUnusedImages();
  });
  
  map.on('zoomstart', () => {
    isMapMoving = true;
  });
  
  map.on('zoomend', () => {
    isMapMoving = false;
    updateVisibleMarkers();
  });
}

// 加载番剧数据
async function loadAnimeData() {
  try {
    // 首先加载番剧基本信息
    const indexResponse = await fetch('https://image.xinu.ink/index.json');
    if (!indexResponse.ok) {
      throw new Error(`HTTP error! status: ${indexResponse.status}`);
    }
    allAnimeData = await indexResponse.json();
    console.log('加载了', Object.keys(allAnimeData).length, '部番剧基本数据');
    
    // 不再预加载所有points.json，而是在需要时按需加载
    console.log('已启用懒加载模式，将在需要时加载番剧地点数据');
  } catch (error) {
    console.error('加载番剧数据失败:', error);
    throw error;
  }
}

// 渲染番剧列表
function renderAnimeList(filter = '', resetList = true) {
  // 更新当前过滤条件
  currentFilter = filter;
  
  // 如果是重置列表，则清空现有内容并重置分页
  if (resetList) {
    animeList.innerHTML = '';
    currentPage = 1;
    hasMoreAnimes = true;
  }
  
  // 如果正在加载或没有更多数据，则直接返回
  if (isLoading || !hasMoreAnimes) return;
  
  // 标记为正在加载
  isLoading = true;
  
  // 添加加载指示器
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
  loadingIndicator.id = 'anime-loading';
  animeList.appendChild(loadingIndicator);
  
  // 过滤番剧数据
  const filteredAnimes = Object.entries(allAnimeData).filter(([id, anime]) => {
    const name = anime.name || '';
    const nameCn = anime.name_cn || '';
    const searchText = filter.toLowerCase();
    
    // 搜索番剧名称
    if (name.toLowerCase().includes(searchText) || nameCn.toLowerCase().includes(searchText)) {
      return true;
    }
    
    // 搜索地点名称
    if (anime.points && anime.points.some(point => {
      const pointName = point.name || '';
      const pointCn = point.cn || '';
      return pointName.toLowerCase().includes(searchText) || pointCn.toLowerCase().includes(searchText);
    })) {
      return true;
    }
    
    return false;
  });
  
  // 计算当前页的起始和结束索引
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredAnimes.length);
  
  // 检查是否还有更多数据
  hasMoreAnimes = endIndex < filteredAnimes.length;
  
  // 移除加载指示器
  const loadingElement = document.getElementById('anime-loading');
  if (loadingElement) {
    loadingElement.remove();
  }
  
  // 如果没有匹配的番剧，显示提示信息
  if (filteredAnimes.length === 0) {
    const noResultsElement = document.createElement('div');
    noResultsElement.className = 'no-results';
    noResultsElement.textContent = '没有找到匹配的番剧';
    animeList.appendChild(noResultsElement);
    isLoading = false;
    return;
  }
  
  // 获取当前页的番剧数据并渲染
  const currentPageAnimes = filteredAnimes.slice(startIndex, endIndex);
  
  // 渲染当前页的番剧
  currentPageAnimes.forEach(([id, anime]) => {
    const animeItem = document.createElement('div');
    animeItem.className = 'anime-item';
    animeItem.dataset.id = id;
    
    // 如果是当前选中的番剧，添加active类
    if (currentAnime === id) {
      animeItem.classList.add('active');
    }
    
    // 使用懒加载方式处理封面图片
    // 获取地点数量，如果points数据尚未加载，则从inform字段中获取
    let pointsCount = 0;
    if (anime.points && Array.isArray(anime.points)) {
      pointsCount = anime.points.length;
    } else if (anime.inform) {
      // 如果有inform字段但没有加载points数据，显示为待加载状态
      pointsCount = '待加载';
    }
    
    animeItem.innerHTML = `
      <img class="anime-cover" src="https://via.placeholder.com/40?text=加载中" data-src="${anime.cover || 'https://via.placeholder.com/40'}" alt="${anime.name || anime.name_cn}">
      <div class="anime-info">
        <p class="anime-name">${anime.name_cn || anime.name}</p>
        <p class="anime-points">${pointsCount} ${typeof pointsCount === 'number' ? '个地点' : ''}</p>
      </div>
    `;
    
    animeItem.addEventListener('click', () => {
      selectAnime(id);
    });
    
    animeList.appendChild(animeItem);
  });
  
  // 加载当前可见的封面图片
  loadVisibleCoverImages();
  
  // 如果还有更多数据，添加一个加载更多的提示
  if (hasMoreAnimes) {
    const loadMoreElement = document.createElement('div');
    loadMoreElement.className = 'load-more-indicator';
    loadMoreElement.textContent = '向下滚动加载更多';
    loadMoreElement.id = 'load-more';
    animeList.appendChild(loadMoreElement);
  }
  
  // 标记为加载完成
  isLoading = false;
  
  // 更新页码
  currentPage++;
}

// 加载可见的番剧封面图片
function loadVisibleCoverImages() {
  // 获取所有带有data-src属性的封面图片
  const coverImages = document.querySelectorAll('.anime-cover[data-src]');
  
  // 遍历所有封面图片
  coverImages.forEach(img => {
    // 检查图片是否在可视区域内
    const rect = img.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    // 如果图片在可视区域内，加载图片
    if (isVisible) {
      const src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
        img.removeAttribute('data-src'); // 移除data-src属性，避免重复加载
      }
    }
  });
}

// 添加所有标记点
async function addAllMarkers() {
  // 清除现有标记点
  clearMarkers();
  
  // 根据当前模式添加标记点
  if (currentMode === 'all') {
    // 只添加可视区域内的标记点
    await addVisibleAnimeMarkers();
  } else if (currentMode === 'single' && currentAnime) {
    await addSingleAnimeMarkers(currentAnime);
  } else if (currentMode === 'guide' && currentGuide) {
    // 添加指南模式的标记点
    // TODO: 实现指南模式
  }
  
  // 初始更新可视区域内的标记点
  await updateVisibleMarkers();
}

// 添加可视区域内的番剧标记点
async function addVisibleAnimeMarkers() {
  // 获取当前地图可视区域
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  
  // 只有在缩放级别足够大时才加载和显示标记点
  if (zoom < 10) { // 可以根据需要调整这个阈值
    console.log('缩放级别过小，不加载标记点');
    return;
  }
  
  // 计算可视区域内的番剧
  const visibleAnimes = new Set();
  
  // 首先检查哪些番剧可能在可视区域内
  for (const [animeId, anime] of Object.entries(allAnimeData)) {
    // 如果已经加载了points数据，检查是否有点在可视区域内
    if (anime.points && Array.isArray(anime.points)) {
      for (const point of anime.points) {
        if (point.geo && point.geo.length === 2 && bounds.contains([point.geo[0], point.geo[1]])) {
          visibleAnimes.add(animeId);
          break;
        }
      }
    }
    // 如果没有加载points数据，我们暂时不处理，等待用户选择或地图移动到更精确的位置
  }
  
  console.log(`当前可视区域内有 ${visibleAnimes.size} 部番剧`);
  
  // 对于可视区域内的每个番剧，加载其points数据并添加标记点
  for (const animeId of visibleAnimes) {
    const anime = allAnimeData[animeId];
    
    // 确保已加载该番剧的地点数据
    if (!anime.points || !Array.isArray(anime.points)) {
      await loadAnimePoints(animeId);
    }
    
    // 如果加载失败或没有地点，跳过
    if (!anime.points || !Array.isArray(anime.points)) continue;
    
    // 添加可视区域内的标记点
    anime.points.forEach(point => {
      if (!point.geo || point.geo.length !== 2) return;
      
      // 检查点是否在可视区域内
      const [lat, lng] = point.geo;
      if (bounds.contains([lat, lng])) {
        // 创建唯一标识符
        const markerId = `${animeId}-${point.geo[0]}-${point.geo[1]}`;
        
        // 如果该标记点尚未添加，则添加它
        if (!visibleMarkers.has(markerId)) {
          const marker = addMarker(point, anime, animeId);
          visibleMarkers.set(markerId, marker);
        }
      }
    });
  }
}

// 按需加载特定番剧的points.json数据
async function loadAnimePoints(animeId) {
  // 如果已经加载过，直接返回
  if (allAnimeData[animeId].points && Array.isArray(allAnimeData[animeId].points)) {
    return allAnimeData[animeId].points;
  }
  
  try {
    // 显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
    loadingIndicator.id = 'points-loading';
    document.body.appendChild(loadingIndicator);
    
    // 加载该番剧的points.json数据
    const pointsUrl = `https://image.xinu.ink/pic/data/${animeId}/points.json`;
    const pointsResponse = await fetch(pointsUrl);
    
    if (pointsResponse.ok) {
      const pointsData = await pointsResponse.json();
      // 将points数据添加到对应的番剧对象中
      allAnimeData[animeId].points = pointsData;
      console.log(`成功加载番剧 ${animeId} 的地点数据，共 ${pointsData.length} 个地点`);
      
      // 移除加载指示器
      const loadingElement = document.getElementById('points-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      return pointsData;
    } else {
      console.warn(`无法加载番剧 ${animeId} 的地点数据:`, pointsResponse.status);
      
      // 移除加载指示器
      const loadingElement = document.getElementById('points-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // 设置为空数组，避免重复请求
      allAnimeData[animeId].points = [];
      return [];
    }
  } catch (error) {
    console.error(`加载番剧 ${animeId} 的地点数据失败:`, error);
    
    // 移除加载指示器
    const loadingElement = document.getElementById('points-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // 设置为空数组，避免重复请求
    allAnimeData[animeId].points = [];
    return [];
  }
}

// 添加单个番剧的标记点
async function addSingleAnimeMarkers(animeId) {
  const anime = allAnimeData[animeId];
  if (!anime) return;
  
  // 确保已加载该番剧的地点数据
  if (!anime.points || !Array.isArray(anime.points)) {
    await loadAnimePoints(animeId);
  }
  
  // 如果没有地点数据或加载失败，直接返回
  if (!anime.points || !Array.isArray(anime.points)) return;
  
  // 计算边界以便自动缩放地图
  const bounds = [];
  
  anime.points.forEach(point => {
    if (!point.geo || point.geo.length !== 2) return;
    
    // 创建唯一标识符
    const markerId = `${animeId}-${point.geo[0]}-${point.geo[1]}`;
    
    // 如果该标记点尚未添加，则添加它
    if (!visibleMarkers.has(markerId)) {
      const marker = addMarker(point, anime, animeId);
      visibleMarkers.set(markerId, marker);
    }
    
    bounds.push([point.geo[0], point.geo[1]]);
  });
  
  // 如果有点，自动缩放地图以显示所有点
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// 添加单个标记点
function addMarker(point, anime, animeId) {
  const [lat, lng] = point.geo;
  const themeColor = anime.theme_color || '#3388ff';
  
  // 决定是否显示为番剧封面图标记
  const shouldShowAnimeCover = Math.random() < 0.001; // 1%的概率显示封面
  
  let marker;
  
  if (shouldShowAnimeCover && anime.cover) {
    // 创建带有番剧封面的标记
    const icon = L.divIcon({
      className: 'anime-marker',
      html: `<div style="width: 30px; height: 30px; background-image: url('${anime.cover}'); background-size: cover; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    marker = L.marker([lat, lng], { icon });
  } else {
    // 创建普通颜色标记
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width: 12px; height: 12px; background-color: ${themeColor}; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
    
    marker = L.marker([lat, lng], { icon });
  }
  
  // 存储点信息，但不立即加载图片
  marker.pointData = {
    point: point,
    anime: anime,
    animeId: animeId
  };
  
  // 绑定点击事件
  marker.on('click', () => {
    // 点击时才加载图片，并设置为优先级加载
    loadPointImage(point, true).then(() => {
      showPointInfo(point, anime, animeId);
    }).catch(error => {
      console.error('加载图片失败，仍然显示信息:', error);
      showPointInfo(point, anime, animeId);
    });
  });
  
  // 添加到地图和标记数组
  marker.addTo(map);
  markers.push(marker);
  
  return marker;
}

// 清除所有标记点
function clearMarkers() {
  markers.forEach(marker => {
    map.removeLayer(marker);
  });
  markers = [];
  visibleMarkers.clear();
}

// 显示地点信息
function showPointInfo(point, anime, animeId) {
  const pointName = document.getElementById('point-name');
  const animeName = document.getElementById('anime-name');
  const episodeInfo = document.getElementById('episode-info');
  const pointImage = document.getElementById('point-image');
  const googleMapsLink = document.getElementById('google-maps-link');
  const googleStreetviewLink = document.getElementById('google-streetview-link');
  const appleMapsLink = document.getElementById('apple-maps-link');
  const traceMoeLink = document.getElementById('trace-moe-link');
  
  // 设置地点名称
  pointName.textContent = point.cn || point.name;
  
  // 设置番剧名称（可点击）
  animeName.innerHTML = `<a href="#" class="anime-link" data-id="${animeId}">${anime.name_cn || anime.name}</a>`;
  document.querySelector('.anime-link').addEventListener('click', (e) => {
    e.preventDefault();
    selectAnime(animeId);
  });
  
  // 设置集数和时间信息
  if (point.ep && point.s !== undefined) {
    const minutes = Math.floor(point.s / 60);
    const seconds = point.s % 60;
    episodeInfo.textContent = `第${point.ep}集 ${minutes}:${seconds.toString().padStart(2, '0')}`;
    traceMoeLink.classList.add('d-none');
  } else {
    episodeInfo.textContent = '未知时间点';
    traceMoeLink.classList.remove('d-none');
    traceMoeLink.href = `https://trace.moe/?url=${encodeURIComponent(point.image)}`;
  }
  
  // 设置图片（使用已加载的图片或占位图）
  pointImage.src = 'https://via.placeholder.com/300x200?text=加载中...';
  
  // 优先级加载此图片，因为它正在被显示
  loadPointImage(point, true).then(() => {
    if (pointImage && !pointImage.src.includes(point.image)) {
      pointImage.src = point.image;
    }
  }).catch(() => {
    // 加载失败时保持占位图
    console.warn(`无法加载图片: ${point.image}`);
  });
  
  pointImage.alt = point.cn || point.name;
  
  // 设置地图链接
  const [lat, lng] = point.geo;
  googleMapsLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  googleStreetviewLink.href = `http://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0`;
  appleMapsLink.href = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(point.cn || point.name)}&t=r`;
  
  // 显示信息卡片
  infoCard.classList.remove('d-none');
}

// 选择番剧
async function selectAnime(animeId) {
  // 更新当前选中的番剧
  currentAnime = animeId;
  
  // 确保已加载该番剧的地点数据
  const anime = allAnimeData[animeId];
  if (!anime.points || !Array.isArray(anime.points)) {
    await loadAnimePoints(animeId);
  }
  
  // 更新模式为单番剧模式
  setMode('single');
  
  // 更新番剧列表中的激活状态
  document.querySelectorAll('.anime-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === animeId);
  });
  
  // 在移动端自动关闭侧边栏
  if (window.innerWidth < 768) {
    sidebar.classList.remove('show');
  }
  
  // 添加该番剧的所有标记点
  await addAllMarkers();
}

// 设置模式
async function setMode(mode) {
  currentMode = mode;
  
  // 更新按钮状态
  modeAllBtn.classList.toggle('active', mode === 'all');
  modeAllBtn.classList.toggle('btn-primary', mode === 'all');
  modeAllBtn.classList.toggle('btn-outline-primary', mode !== 'all');
  
  modeSingleBtn.classList.toggle('active', mode === 'single');
  modeSingleBtn.classList.toggle('btn-primary', mode === 'single');
  modeSingleBtn.classList.toggle('btn-outline-primary', mode !== 'single');
  
  modeGuideBtn.classList.toggle('active', mode === 'guide');
  modeGuideBtn.classList.toggle('btn-primary', mode === 'guide');
  modeGuideBtn.classList.toggle('btn-outline-primary', mode !== 'guide');
  
  // 更新标记点
  await addAllMarkers();
}

// 绑定事件
function bindEvents() {
  // 搜索功能
  searchButton.addEventListener('click', () => {
    const searchText = searchInput.value.trim();
    renderAnimeList(searchText, true); // 重置列表并搜索
  });
  
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const searchText = searchInput.value.trim();
      renderAnimeList(searchText, true); // 重置列表并搜索
    }
  });
  
  // 关闭信息卡片
  closeInfoBtn.addEventListener('click', () => {
    infoCard.classList.add('d-none');
  });
  
  // 模式切换
  modeAllBtn.addEventListener('click', async () => await setMode('all'));
  modeSingleBtn.addEventListener('click', async () => {
    if (!currentAnime) {
      alert('请先选择一部番剧');
      return;
    }
    await setMode('single');
  });
  modeGuideBtn.addEventListener('click', async () => {
    if (!currentGuide) {
      alert('请先选择一个指南');
      return;
    }
    await setMode('guide');
  });
  
  // 移动端侧边栏切换
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('show');
  });
  
  // 点击地图空白处关闭侧边栏（移动端）
  map.on('click', () => {
    if (window.innerWidth < 768 && sidebar.classList.contains('show')) {
      sidebar.classList.remove('show');
    }
  });
  
  // 窗口大小变化时调整布局
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove('show');
    }
    // 窗口大小变化时更新可见标记点
    updateVisibleMarkers();
    // 加载可见的封面图片
    loadVisibleCoverImages();
  });
  
  // 地图拖动时防抖更新标记点
  map.on('move', debounceUpdateMarkers);
  map.on('zoom', debounceUpdateMarkers);
  
  // 番剧列表滚动事件 - 用于加载更多番剧和懒加载封面图片
  const animeListContainer = document.querySelector('.anime-list-container');
  animeListContainer.addEventListener('scroll', () => {
    // 加载可见的封面图片
    loadVisibleCoverImages();
    
    // 检查是否滚动到底部，如果是则加载更多番剧
    const scrollTop = animeListContainer.scrollTop;
    const scrollHeight = animeListContainer.scrollHeight;
    const clientHeight = animeListContainer.clientHeight;
    
    // 当滚动到距离底部100px时，加载更多
    if (scrollHeight - scrollTop - clientHeight < 100 && !isLoading && hasMoreAnimes) {
      renderAnimeList(currentFilter, false); // 不重置列表，继续加载更多
    }
  });
}

// 显示加载动画
function showLoader() {
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = '<div class="loader-spinner"></div>';
  loader.id = 'loader';
  document.body.appendChild(loader);
}

// 隐藏加载动画
function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.remove();
  }
}

// 加载点的图片
async function loadPointImage(point, isPriority = false) {
  // 如果图片已经在缓存中，更新其在LRU队列中的位置并直接返回
  if (imageCache.has(point.image)) {
    // 更新LRU队列 - 将此图片移到队列末尾（表示最近使用）
    const index = imageCacheQueue.indexOf(point.image);
    if (index > -1) {
      imageCacheQueue.splice(index, 1);
    }
    imageCacheQueue.push(point.image);
    return imageCache.get(point.image);
  }
  
  // 检查是否已在加载队列中
  if (imageLoadQueue.includes(point.image)) {
    // 如果已在加载队列中，但当前是优先级请求，则将其提升到队列前面
    if (isPriority) {
      const index = imageLoadQueue.indexOf(point.image);
      if (index > -1) {
        imageLoadQueue.splice(index, 1);
        imageLoadQueue.unshift(point.image); // 移到队列前面优先加载
      }
    }
    
    // 等待加载完成
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (imageCache.has(point.image)) {
          clearInterval(checkInterval);
          resolve(imageCache.get(point.image));
        }
      }, 100);
    });
  }
  
  // 添加到加载队列，优先级高的放在队列前面
  if (isPriority) {
    imageLoadQueue.unshift(point.image);
  } else {
    imageLoadQueue.push(point.image);
  }
  
  // 否则加载图片并缓存
  try {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // 检查缓存是否已满
        if (imageCacheQueue.length >= MAX_CACHE_SIZE) {
          // 移除最久未使用的图片（队列头部）
          const oldestImage = imageCacheQueue.shift();
          imageCache.delete(oldestImage);
        }
        
        // 添加新图片到缓存和队列
        imageCache.set(point.image, point.image);
        imageCacheQueue.push(point.image);
        
        // 从加载队列中移除
        const loadIndex = imageLoadQueue.indexOf(point.image);
        if (loadIndex > -1) {
          imageLoadQueue.splice(loadIndex, 1);
        }
        
        resolve(point.image);
      };
      img.onerror = () => {
        console.warn(`无法加载图片: ${point.image}`);
        
        // 从加载队列中移除
        const loadIndex = imageLoadQueue.indexOf(point.image);
        if (loadIndex > -1) {
          imageLoadQueue.splice(loadIndex, 1);
        }
        
        reject(new Error(`无法加载图片: ${point.image}`));
      };
      img.src = point.image;
    });
  } catch (error) {
    console.error('加载图片失败:', error);
    
    // 从加载队列中移除
    const loadIndex = imageLoadQueue.indexOf(point.image);
    if (loadIndex > -1) {
      imageLoadQueue.splice(loadIndex, 1);
    }
    
    return null;
  }
}

// 更新可视区域内的标记点
async function updateVisibleMarkers() {
  if (isMapMoving) return; // 如果地图正在移动，不更新标记点
  
  // 获取当前地图可视区域
  const bounds = map.getBounds();
  const visibleIds = new Set();
  
  // 根据当前模式决定要显示的标记点
  if (currentMode === 'all') {
    // 获取当前可视区域的中心点和缩放级别
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    // 只有在缩放级别足够大时才加载和显示标记点
    if (zoom >= 10) { // 可以根据需要调整这个阈值
      // 计算可视区域内的番剧
      const visibleAnimes = new Set();
      
      // 首先检查哪些番剧可能在可视区域内
      // 这里我们使用一个简单的启发式方法：检查番剧的第一个点是否在可视区域内
      // 或者如果番剧还没有加载points数据，则根据其他信息（如封面图位置）来判断
      for (const [animeId, anime] of Object.entries(allAnimeData)) {
        // 如果已经加载了points数据，检查是否有点在可视区域内
        if (anime.points && Array.isArray(anime.points)) {
          for (const point of anime.points) {
            if (point.geo && point.geo.length === 2 && bounds.contains([point.geo[0], point.geo[1]])) {
              visibleAnimes.add(animeId);
              break;
            }
          }
        }
        // 如果没有加载points数据，我们暂时不处理，等待用户选择或地图移动到更精确的位置
      }
      
      // 对于可视区域内的每个番剧，加载其points数据并添加标记点
      for (const animeId of visibleAnimes) {
        const anime = allAnimeData[animeId];
        
        // 确保已加载该番剧的地点数据
        if (!anime.points || !Array.isArray(anime.points)) {
          await loadAnimePoints(animeId);
        }
        
        // 如果加载失败或没有地点，跳过
        if (!anime.points || !Array.isArray(anime.points)) continue;
        
        // 添加可视区域内的标记点
        anime.points.forEach(point => {
          if (!point.geo || point.geo.length !== 2) return;
          
          const [lat, lng] = point.geo;
          if (bounds.contains([lat, lng])) {
            // 创建唯一标识符
            const markerId = `${animeId}-${point.geo[0]}-${point.geo[1]}`;
            visibleIds.add(markerId);
            
            // 如果该标记点尚未添加，则添加它
            if (!visibleMarkers.has(markerId)) {
              const marker = addMarker(point, anime, animeId);
              visibleMarkers.set(markerId, marker);
            }
          }
        });
      }
    }
  } else if (currentMode === 'single' && currentAnime) {
    // 只显示当前选中番剧的点
    const anime = allAnimeData[currentAnime];
    
    // 确保已加载该番剧的地点数据
    if (!anime.points || !Array.isArray(anime.points)) {
      await loadAnimePoints(currentAnime);
    }
    
    if (anime && anime.points && Array.isArray(anime.points)) {
      anime.points.forEach(point => {
        if (!point.geo || point.geo.length !== 2) return;
        
        // 单番剧模式下，所有点都显示，不考虑是否在可视区域内
        const markerId = `${currentAnime}-${point.geo[0]}-${point.geo[1]}`;
        visibleIds.add(markerId);
        
        if (!visibleMarkers.has(markerId)) {
          const marker = addMarker(point, anime, currentAnime);
          visibleMarkers.set(markerId, marker);
        }
      });
    }
  }
  
  // 移除不在可视区域内的标记点
  visibleMarkers.forEach((marker, markerId) => {
    if (!visibleIds.has(markerId)) {
      map.removeLayer(marker);
      visibleMarkers.delete(markerId);
      
      // 从markers数组中也移除
      const index = markers.indexOf(marker);
      if (index > -1) {
        markers.splice(index, 1);
      }
    }
  });
}

// 防抖函数，避免地图移动时频繁更新标记点
function debounceUpdateMarkers() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(async () => {
    if (!isMapMoving) {
      await updateVisibleMarkers();
      // 地图停止移动后，优先加载视口内的图片
      prioritizeVisibleImages();
    }
  }, 300); // 300毫秒的防抖延迟
}

// 图片生命周期管理
function startImageLifecycleManagement() {
  // 每60秒检查一次，清理不在视口内的图片
  imageCleanupTimer = setInterval(() => {
    cleanupUnusedImages();
    // 输出内存使用情况
    logMemoryUsage();
  }, 60000);
  
  // 初始输出内存使用情况
  logMemoryUsage();
}

// 清理未使用的图片
function cleanupUnusedImages() {
  // 如果缓存未达到阈值，不进行清理
  if (imageCacheQueue.length < MAX_CACHE_SIZE * 0.8) {
    return;
  }
  
  // 获取当前可视区域
  const bounds = map.getBounds();
  const visibleImageUrls = new Set();
  
  // 收集当前视口内所有标记点的图片URL
  visibleMarkers.forEach((marker) => {
    if (marker.pointData && marker.pointData.point && marker.pointData.point.image) {
      visibleImageUrls.add(marker.pointData.point.image);
    }
  });
  
  // 收集当前显示在信息卡片中的图片
  const infoCardImage = document.getElementById('point-image');
  if (infoCardImage && infoCardImage.src && !infoCardImage.src.includes('placeholder')) {
    visibleImageUrls.add(infoCardImage.src);
  }
  
  // 清理不在视口内且不是最近使用的图片
  const imagesToKeep = [];
  
  // 保留视口内的图片和最近使用的图片（保留最近使用的30%）
  const recentlyUsedCount = Math.floor(MAX_CACHE_SIZE * 0.3);
  const recentlyUsed = imageCacheQueue.slice(-recentlyUsedCount);
  
  imageCacheQueue.forEach(imageUrl => {
    if (visibleImageUrls.has(imageUrl) || recentlyUsed.includes(imageUrl)) {
      imagesToKeep.push(imageUrl);
    } else {
      // 从缓存中移除
      imageCache.delete(imageUrl);
    }
  });
  
  // 更新缓存队列
  imageCacheQueue = imagesToKeep;
  
  console.log(`图片缓存清理完成，当前缓存数量: ${imageCacheQueue.length}`);
}

// 优先加载视口内的图片
function prioritizeVisibleImages() {
  // 获取当前可视区域内的所有标记点
  const visiblePoints = [];
  
  visibleMarkers.forEach((marker) => {
    if (marker.pointData && marker.pointData.point) {
      visiblePoints.push(marker.pointData.point);
    }
  });
  
  // 对视口内的点进行预加载，但限制同时加载的数量
  const MAX_CONCURRENT_LOADS = 5;
  let loadingCount = 0;
  
  // 先加载视口中心附近的点
  const mapCenter = map.getCenter();
  visiblePoints.sort((a, b) => {
    const distA = L.latLng(a.geo[0], a.geo[1]).distanceTo(mapCenter);
    const distB = L.latLng(b.geo[0], b.geo[1]).distanceTo(mapCenter);
    return distA - distB;
  });
  
  // 预加载前10个最近的点的图片
  visiblePoints.slice(0, 10).forEach(point => {
    if (!imageCache.has(point.image) && !imageLoadQueue.includes(point.image) && loadingCount < MAX_CONCURRENT_LOADS) {
      loadingCount++;
      loadPointImage(point).finally(() => {
        loadingCount--;
      });
    }
  });
}

// 记录内存使用情况
function logMemoryUsage() {
  console.log(`图片缓存统计：当前缓存 ${imageCacheQueue.length}/${MAX_CACHE_SIZE} 张图片，加载队列中 ${imageLoadQueue.length} 张`);
  
  // 如果浏览器支持performance.memory，则显示内存使用情况
  if (window.performance && window.performance.memory) {
    const memoryInfo = window.performance.memory;
    console.log(`内存使用情况：${Math.round(memoryInfo.usedJSHeapSize / 1048576)}MB / ${Math.round(memoryInfo.jsHeapSizeLimit / 1048576)}MB`);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
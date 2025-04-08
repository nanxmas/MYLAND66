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
let currentMapSource = 'osm'; // 当前地图源
let guides = []; // 用户创建的指南列表
let guidePaths = []; // 指南路径线图层
let animeExpandActivated = false; // 番剧列表是否已激活展开加载功能

// 地图源配置
const mapSources = {
  'osm': {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  'osmCN': {
    name: 'OSM中国镜像',
    url: 'https://tile.openstreetmap.cn/data/1.0.0/base/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  'osmHOT': {
    name: 'OSM人道救援图',
    url: 'https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  'osmWinter': {
    name: 'OSM冬日地图',
    url: 'https://w3.outdooractive.com/map/v1/png/osm_winter/{z}/{x}/{y}/t.png?project=api-dev-oa',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  'geoqGray': {
    name: '灰色地图',
    url: 'https://thematic.geoq.cn/arcgis/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: '&copy; <a href="https://www.geoq.cn/">GeoQ</a>'
    }
  },
  'arcgisOcean': {
    name: '海洋渲染图',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>'
    }
  },
  'arcgisWorld': {
    name: 'ArcGIS卫星图',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>'
    }
  },
  'arcgisStreet': {
    name: 'ArcGIS街道',
    url: 'https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>'
    }
  },
  'hereSatellite': {
    name: 'Here卫星地图',
    url: 'https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/jpeg?apiKey=ULcxipCuamEAS6NsNntuAMM84LddvMOlXH0BsE2RfaU&lang=en&style=satellite.day&size=512',
    options: {
      attribution: '&copy; <a href="https://www.here.com/">HERE</a>'
    }
  },
  'googleCN': {
    name: '谷歌CN卫星',
    url: 'https://gac-geo.googlecnapps.cn/maps/vt?lyrs=s&gl=US&x={x}&y={y}&z={z}',
    options: {
      attribution: '&copy; <a href="https://www.google.cn/maps/">Google</a>'
    }
  },
  'googleStreet': {
    name: '谷歌街道地图',
    url: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/world_imagery/wmts/1.0.0/default028mm/mapserver/tile/45441/{z}/{y}/{x}',
    options: {
      attribution: '&copy; <a href="https://www.google.com/maps/">Google</a>'
    }
  },
  'mapbox': {
    name: 'Mapbox Streets',
    url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
    options: {
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
    }
  },
  'mapboxSatellite': {
    name: 'Mapbox卫星',
    url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
    options: {
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
    }
  },
  'gaode': {
    name: '高德地图',
    url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    options: {
      attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>'
    }
  }
};

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
    
    // 加载用户指南数据
    loadGuides();
    
    // 渲染番剧列表
    renderAnimeList();
    
    // 渲染指南列表
    renderGuideList();
    
    // 添加所有标记点（现在是异步的）
    await addAllMarkers();
    
    // 绑定事件
    bindEvents();
    
    // 启动图片生命周期管理
    startImageLifecycleManagement();
    
    // 初始化L2D站娘
    initL2D();
    
    // 从URL解析参数
    parseUrlParams();
    
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
  
  // 添加地图图层，使用当前选择的地图源
  const source = mapSources[currentMapSource];
  L.tileLayer(source.url, source.options).addTo(map);
  
  // 添加地图源选择控件
  addMapSourceControl();
  
  // 地图源切换函数
  function changeMapSource(sourceName) {
    if (!mapSources[sourceName]) return;
    
    // 移除当前地图图层
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    // 添加新的地图图层
    const source = mapSources[sourceName];
    L.tileLayer(source.url, source.options).addTo(map);
    
    // 更新当前地图源
    currentMapSource = sourceName;
    
    // 更新控件状态
    updateMapSourceControl();
  }
  
  // 添加地图源选择控件
  function addMapSourceControl() {
    const mapSourceControl = L.control({ position: 'topright' });
    
    mapSourceControl.onAdd = function() {
      const container = L.DomUtil.create('div', 'map-source-control leaflet-bar leaflet-control');
      container.id = 'map-source-control';
      
      const button = L.DomUtil.create('a', 'map-source-button', container);
      button.href = '#';
      button.title = '切换地图源';
      button.innerHTML = '<i class="bi bi-layers"></i>';
      
      const dropdown = L.DomUtil.create('div', 'map-source-dropdown', container);
      
      // 将地图源分类
      const categories = {
        'standard': { title: '标准地图', sources: [] },
        'satellite': { title: '卫星影像', sources: [] },
        'special': { title: '特色地图', sources: [] }
      };
      
      // 对地图源进行分类
      Object.entries(mapSources).forEach(([key, source]) => {
        if (key.includes('Satellite') || key.includes('satellite') || key === 'arcgisWorld' || key === 'googleCN') {
          categories.satellite.sources.push({ key, source });
        } else if (key.includes('Winter') || key.includes('Ocean') || key.includes('Gray')) {
          categories.special.sources.push({ key, source });
        } else {
          categories.standard.sources.push({ key, source });
        }
      });
      
      // 添加分类和地图源选项
      Object.entries(categories).forEach(([categoryKey, category]) => {
        if (category.sources.length > 0) {
          // 添加分类标题
          const categoryTitle = L.DomUtil.create('div', 'map-source-category', dropdown);
          categoryTitle.textContent = category.title;
          
          // 添加该分类下的地图源
          category.sources.forEach(({ key, source }) => {
            const option = L.DomUtil.create('a', 'map-source-option', dropdown);
            option.href = '#';
            option.dataset.source = key;
            option.textContent = source.name;
            
            if (key === currentMapSource) {
              option.classList.add('active');
            }
            
            L.DomEvent.on(option, 'click', function(e) {
              L.DomEvent.preventDefault(e);
              L.DomEvent.stopPropagation(e);
              changeMapSource(key);
              dropdown.classList.remove('show');
            });
          });
        }
      });
      
      // 切换下拉菜单显示/隐藏
      L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        dropdown.classList.toggle('show');
      });
      
      // 点击地图其他区域时隐藏下拉菜单
      L.DomEvent.on(document, 'click', function(e) {
        if (!container.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
      
      L.DomEvent.disableClickPropagation(container);
      return container;
    };
    
    mapSourceControl.addTo(map);
  }
  
  // 更新地图源控件状态
  function updateMapSourceControl() {
    const dropdown = document.querySelector('.map-source-dropdown');
    if (!dropdown) return;
    
    const options = dropdown.querySelectorAll('.map-source-option');
    options.forEach(option => {
      if (option.dataset.source === currentMapSource) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }
  
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
    
    // 创建两个独立的容器，一个用于番剧，一个用于地点
    const animeContainer = document.createElement('div');
    animeContainer.id = 'anime-container';
    animeContainer.className = 'anime-section';
    
    const pointContainer = document.createElement('div');
    pointContainer.id = 'point-container';
    pointContainer.className = 'point-section';
    
    // 添加到主列表中
    animeList.appendChild(animeContainer);
    animeList.appendChild(pointContainer);
  }
  
  // 获取容器引用
  const animeContainer = document.getElementById('anime-container');
  const pointContainer = document.getElementById('point-container');
  
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
  const filteredResults = [];
  Object.entries(allAnimeData).forEach(([id, anime]) => {
    const name = anime.name || '';
    const nameCn = anime.name_cn || '';
    const searchText = filter.toLowerCase();
    
    // 搜索番剧名称
    if (name.toLowerCase().includes(searchText) || nameCn.toLowerCase().includes(searchText)) {
      // 找到匹配的番剧
      filteredResults.push({
        type: 'anime',
        id,
        anime,
        matchType: 'title'
      });
    }
    
    // 搜索地点名称
    if (anime.points && Array.isArray(anime.points)) {
      anime.points.forEach(point => {
        const pointName = String(point.name || '');
        const pointCn = String(point.cn || '');
        if (pointName.toLowerCase().includes(searchText) || pointCn.toLowerCase().includes(searchText)) {
          // 找到匹配的地点
          filteredResults.push({
            type: 'point',
            id,
            anime,
            point,
            matchType: 'location'
          });
        }
      });
    }
  });

  // 将结果按类型分组
  const animeResults = filteredResults.filter(result => result.type === 'anime');
  const pointResults = filteredResults.filter(result => result.type === 'point');
  
  // 移除加载指示器
  const loadingElement = document.getElementById('anime-loading');
  if (loadingElement) {
    loadingElement.remove();
  }
  
  // 如果没有匹配的结果，显示提示信息
  if (filteredResults.length === 0) {
    const noResultsElement = document.createElement('div');
    noResultsElement.className = 'no-results';
    noResultsElement.textContent = '没有找到匹配的番剧或地点';
    animeList.appendChild(noResultsElement);
    isLoading = false;
    return;
  }
  
  // 计算当前页的起始和结束索引 - 番剧和地点分开计算
  let animeStartIndex, animeEndIndex;
  let pointStartIndex, pointEndIndex;
  
  if (filter) {
    // 搜索结果 - 显示所有结果
    animeStartIndex = 0;
    animeEndIndex = animeResults.length;
    pointStartIndex = 0;
    pointEndIndex = pointResults.length;
    hasMoreAnimes = false; // 搜索结果一次性全部显示，没有更多数据
  } else {
    // 首页番剧列表 - 分页显示
    animeStartIndex = (currentPage - 1) * PAGE_SIZE;
    animeEndIndex = Math.min(animeStartIndex + PAGE_SIZE, animeResults.length);
    
    // 地点列表也使用相同的分页逻辑，但是独立计算
    pointStartIndex = (currentPage - 1) * PAGE_SIZE;
    pointEndIndex = Math.min(pointStartIndex + PAGE_SIZE, pointResults.length);
    
    // 检查是否还有更多数据 - 只要有一种类型还有更多数据，就继续加载
    hasMoreAnimes = animeEndIndex < animeResults.length || pointEndIndex < pointResults.length;
  }
  
  // 获取当前页的番剧和地点数据
  const currentPageAnimes = animeResults.slice(animeStartIndex, animeEndIndex);
  const currentPagePoints = pointResults.slice(pointStartIndex, pointEndIndex);
  
  // 渲染番剧项的函数
  const renderAnimeItem = (result, container) => {
    const animeItem = document.createElement('div');
    animeItem.className = 'anime-item';
    animeItem.dataset.id = result.id;
    
    // 如果是当前选中的番剧，添加active类
    if (currentAnime === result.id) {
      animeItem.classList.add('active');
    }
    
    const anime = result.anime;
    let pointsCount = 0;
    if (anime.points && Array.isArray(anime.points)) {
      pointsCount = anime.points.length;
    } else if (anime.inform) {
      pointsCount = '待加载';
    }
    
    animeItem.innerHTML = `
      <img class="anime-cover" src="loading.svg" data-src="${anime.cover || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
      <div class="anime-info">
        <p class="anime-name">${anime.name_cn || anime.name}</p>
        <p class="anime-points">${pointsCount} ${typeof pointsCount === 'number' ? '个地点' : ''}</p>
      </div>
    `;
    
    animeItem.addEventListener('click', () => {
      selectAnime(result.id);
    });
    
    container.appendChild(animeItem);
  };
  
  // 渲染地点项的函数
  const renderPointItem = (result, container) => {
    const pointItem = document.createElement('div');
    pointItem.className = 'point-item';
    pointItem.dataset.id = result.id;
    
    // 如果是当前选中的番剧，添加active类
    if (currentAnime === result.id) {
      pointItem.classList.add('active');
    }
    
    const point = result.point;
    const anime = result.anime;
    
    pointItem.innerHTML = `
      <img class="point-cover" src="loading.svg" data-src="${point.image || 'loading.svg'}" alt="${point.cn || point.name}">
      <div class="point-info">
        <p class="point-name">${point.cn || point.name}</p>
        <p class="anime-title">${anime.name_cn || anime.name}</p>
      </div>
    `;
    
    pointItem.addEventListener('click', () => {
      // 如果是地点搜索结果，选择对应的番剧并定位到该地点
      selectAnime(result.id);
      if (point.geo && point.geo.length === 2) {
        console.log('定位到地点:', point.cn || point.name);
        map.setView([point.geo[0], point.geo[1]], 16);
        // 显示地点信息
        showPointInfo(point, result.anime, result.id);
      }
    });
    
    container.appendChild(pointItem);
  };
  
  // 如果是搜索结果，显示所有结果
  if (filter) {
    // 清空容器
    if (resetList) {
      animeContainer.innerHTML = '';
      pointContainer.innerHTML = '';
    }
    
    // 添加标题
    if (animeResults.length > 0) {
      if (animeContainer.querySelector('.search-category') === null) {
        const animeTitle = document.createElement('h6');
        animeTitle.className = 'search-category';
        animeTitle.textContent = '番剧';
        animeContainer.appendChild(animeTitle);
      }
      
      // 添加番剧结果
      animeResults.forEach(result => {
        renderAnimeItem(result, animeContainer);
      });
    }
    
    // 添加地点结果
    if (pointResults.length > 0) {
      if (pointContainer.querySelector('.search-category') === null) {
        const pointTitle = document.createElement('h6');
        pointTitle.className = 'search-category';
        pointTitle.textContent = '巡礼地点';
        pointContainer.appendChild(pointTitle);
      }
      
      pointResults.forEach(result => {
        renderPointItem(result, pointContainer);
      });
    }
  } else {
    // 首页模式 - 分页显示
    
    // 添加番剧标题（如果还没有）
    if (animeContainer.querySelector('.search-category') === null) {
      const animeTitle = document.createElement('h6');
      animeTitle.className = 'search-category';
      animeTitle.textContent = '番剧';
      animeContainer.appendChild(animeTitle);
    }
    
    // 添加地点标题（如果还没有）
    if (pointContainer.querySelector('.search-category') === null) {
      const pointTitle = document.createElement('h6');
      pointTitle.className = 'search-category';
      pointTitle.textContent = '巡礼地点';
      pointContainer.appendChild(pointTitle);
    }
    
    // 添加番剧项
    currentPageAnimes.forEach(result => {
      renderAnimeItem(result, animeContainer);
    });
    
    // 添加地点项
    currentPagePoints.forEach(result => {
      renderPointItem(result, pointContainer);
    });
    
    // 如果还有更多番剧数据，添加展开按钮
    if (animeEndIndex < animeResults.length && !animeContainer.querySelector('#expand-anime-btn')) {
      const expandButton = document.createElement('button');
      expandButton.className = 'btn btn-outline-primary btn-sm expand-anime-btn';
      expandButton.textContent = '展开更多番剧';
      expandButton.id = 'expand-anime-btn';
      animeContainer.appendChild(expandButton);
      
      // 点击展开按钮加载更多番剧
      expandButton.addEventListener('click', function() {
        // 移除展开按钮
        this.remove();
        
        // 激活滚动加载更多功能
        animeExpandActivated = true;
        console.log('已激活番剧展开加载功能');
        
        // 立即加载下一批番剧
        currentPage++; // 确保加载下一页
        renderAnimeList('', false); // 不重置列表，加载更多番剧
        
        // 预加载下一批数据
        setTimeout(() => {
          if (hasMoreAnimes) {
            currentPage++;
            renderAnimeList('', false);
          }
        }, 500);
      });
    }
    
    // 如果还有更多地点数据，添加加载更多提示
    if (pointEndIndex < pointResults.length && !pointContainer.querySelector('#load-more-point')) {
      const loadMoreElement = document.createElement('div');
      loadMoreElement.className = 'load-more-indicator';
      loadMoreElement.textContent = '向下滚动加载更多巡礼地点';
      loadMoreElement.id = 'load-more-point';
      pointContainer.appendChild(loadMoreElement);
    }
  }
  
  // 加载当前可见的封面图片
  loadVisibleCoverImages();
  
  // 添加CSS样式
  if (!document.getElementById('expand-button-style')) {
    const style = document.createElement('style');
    style.id = 'expand-button-style';
    style.textContent = `
      .anime-section, .point-section {
        margin-bottom: 20px;
      }
      .expand-anime-btn {
        margin: 10px auto;
        display: block;
        width: 80%;
        padding: 8px;
        border-radius: 20px;
        transition: all 0.3s ease;
      }
      .expand-anime-btn:hover {
        background-color: #007bff;
        color: white;
      }
      .load-more-indicator {
        text-align: center;
        padding: 10px;
        color: #6c757d;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);
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
  pointImage.src = 'loading.svg';
  
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
  
  // 地图源切换事件 - 为移动设备添加点击事件处理
  document.addEventListener('click', (e) => {
    const mapSourceControl = document.getElementById('map-source-control');
    if (mapSourceControl && !mapSourceControl.contains(e.target)) {
      const dropdown = document.querySelector('.map-source-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
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
    
    // 当滚动到距离底部200px时，加载更多，提前预加载内容
    if (scrollHeight - scrollTop - clientHeight < 200 && !isLoading && hasMoreAnimes) {
      console.log('滚动到底部，尝试加载更多内容');
      // 如果是搜索模式，直接加载更多
      if (currentFilter) {
        console.log('搜索模式：加载更多搜索结果');
        renderAnimeList(currentFilter, false); // 不重置列表，继续加载更多
      } else {
        // 非搜索模式下，检查是否应该加载更多
        if (animeExpandActivated) {
          console.log('番剧展开模式：加载更多番剧');
          renderAnimeList('', false); // 不重置列表，继续加载更多
        } else if (document.getElementById('load-more-point')) {
          console.log('巡礼地点模式：加载更多地点');
          renderAnimeList('', false); // 不重置列表，继续加载更多
        } else {
          console.log('未激活展开加载功能，不加载更多内容');
        }
      }
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

// 添加地理编码服务
const geocoder = L.Control.Geocoder.nominatim();

// 搜索结果处理函数
async function handleSearch() {
  const searchText = searchInput.value.trim();
  if (!searchText) return;

  // 显示搜索区域的加载状态
  const searchContainer = document.querySelector('.search-container');
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'load-more-indicator';
  loadingIndicator.textContent = '正在搜索...';
  animeList.innerHTML = '';
  animeList.appendChild(loadingIndicator);

  try {
    // 1. 搜索番剧和巡礼点
    const animeResults = await searchAnimeAndPoints(searchText);

    // 2. 搜索地理位置
    const locationResults = await searchLocation(searchText);

    // 3. 合并搜索结果
    const combinedResults = {
      animes: animeResults.animes || [],
      points: animeResults.points || [],
      locations: locationResults || []
    };

    // 4. 渲染搜索结果
    renderSearchResults(combinedResults);
  } catch (error) {
    console.error('搜索出错:', error);
    animeList.innerHTML = '<div class="no-results">搜索出错，请重试</div>';
  }
}

// 搜索番剧和巡礼点
async function searchAnimeAndPoints(searchText) {
  const results = {
    animes: [],
    points: []
  };

  const searchLower = searchText.toLowerCase();

  // 搜索番剧
  for (const [id, anime] of Object.entries(allAnimeData)) {
    const name = (anime.name || '').toLowerCase();
    const nameCn = (anime.name_cn || '').toLowerCase();

    if (name.includes(searchLower) || nameCn.includes(searchLower)) {
      results.animes.push({ id, anime });
    }

    // 搜索巡礼点
    if (anime.points && Array.isArray(anime.points)) {
      anime.points.forEach(point => {
        const pointName = String(point.name || '');
        const pointCn = String(point.cn || '');

        if (pointName.toLowerCase().includes(searchLower) || pointCn.toLowerCase().includes(searchLower)) {
          results.points.push({ point, animeId: id, anime });
        }
      });
    }
  }

  // 搜索地图地点
  let locationResults = [];
  try {
    // 使用国内可访问的反向代理服务
    const nominatimUrl = 'https://nominatim.openstreetmap.org';
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const searchUrl = `${proxyUrl}${encodeURIComponent(`${nominatimUrl}/search?format=json&q=${encodeURIComponent(searchText)}`)}`;    
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const results = await response.json();
    locationResults = results.map(result => ({
      center: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
      name: result.display_name,
      properties: {
        ...result.address,
        type: result.type,
        class: result.class
      },
      bbox: result.boundingbox ? [
        [parseFloat(result.boundingbox[0]), parseFloat(result.boundingbox[2])],
        [parseFloat(result.boundingbox[1]), parseFloat(result.boundingbox[3])]
      ] : undefined
    }));
    
    // 限制只显示前8个结果
    locationResults = locationResults.slice(0, 8);
  } catch (error) {
    console.error('地图搜索出错:', error);
  }

  return {
    ...results,
    locations: locationResults
  };

}

// 搜索地理位置
async function searchLocation(searchText) {
  try {
    const nominatimUrl = 'https://nominatim.openstreetmap.org';
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const searchUrl = `${proxyUrl}${encodeURIComponent(`${nominatimUrl}/search?format=json&q=${encodeURIComponent(searchText)}`)}`;    
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const results = await response.json();
    return results.map(result => ({
      center: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
      name: result.display_name,
      properties: {
        ...result.address,
        type: result.type,
        class: result.class
      },
      bbox: result.boundingbox ? [
        [parseFloat(result.boundingbox[0]), parseFloat(result.boundingbox[2])],
        [parseFloat(result.boundingbox[1]), parseFloat(result.boundingbox[3])]
      ] : undefined
    }));
  } catch (error) {
    console.error('地图搜索出错:', error);
    return [];
  }
}

// 渲染搜索结果
function renderSearchResults(searchResults) {
  // 清空现有列表
  animeList.innerHTML = '';

  // 如果没有任何搜索结果
  if (searchResults.animes.length === 0 && searchResults.points.length === 0 && (!searchResults.locations || searchResults.locations.length === 0)) {
    animeList.innerHTML = '<div class="no-results">没有找到匹配的结果</div>';
    return;
  }

  // 1. 渲染番剧结果
  if (searchResults.animes.length > 0) {
    const animeSection = document.createElement('div');
    animeSection.className = 'search-section';
    animeSection.innerHTML = '<h6 class="search-category">番剧</h6>';

    searchResults.animes.forEach(({ id, anime }) => {
      const animeItem = createAnimeListItem(id, anime);
      animeSection.appendChild(animeItem);
    });

    animeList.appendChild(animeSection);
  } else if (searchResults.animes === undefined) {
    // 如果番剧搜索失败，显示错误信息
    const animeSection = document.createElement('div');
    animeSection.className = 'search-section';
    animeSection.innerHTML = '<h6 class="search-category">番剧</h6>';
    
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = '番剧搜索失败，请重试';
    animeSection.appendChild(noResults);
    
    animeList.appendChild(animeSection);
  }

  // 2. 渲染巡礼点结果
  if (searchResults.points.length > 0) {
    const pointsSection = document.createElement('div');
    pointsSection.className = 'search-section';
    pointsSection.innerHTML = '<h6 class="search-category">巡礼地点</h6>';

    searchResults.points.forEach(({ point, animeId, anime }) => {
      const pointItem = createPointListItem(point, animeId, anime);
      pointsSection.appendChild(pointItem);
    });

    animeList.appendChild(pointsSection);
  } else if (searchResults.points === undefined) {
    // 如果巡礼点搜索失败，显示错误信息
    const pointsSection = document.createElement('div');
    pointsSection.className = 'search-section';
    pointsSection.innerHTML = '<h6 class="search-category">巡礼地点</h6>';
    
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = '巡礼点搜索失败，请重试';
    pointsSection.appendChild(noResults);
    
    animeList.appendChild(pointsSection);
  }

  // 3. 渲染地图位置搜索结果
  if (searchResults.locations && searchResults.locations.length > 0) {
    const locationSection = document.createElement('div');
    locationSection.className = 'search-section';
    locationSection.innerHTML = '<h6 class="search-category">地图位置</h6>';

    searchResults.locations.forEach(location => {
      const locationItem = document.createElement('div');
      locationItem.className = 'location-item';
      
      // 提取地址信息
      const address = location.properties;
      const mainName = address.amenity || address.building || address.road || '';
      const subName = [
        address.city || address.town || address.village,
        address.province || address.state,
        address.country
      ].filter(Boolean).join(', ');

      locationItem.innerHTML = `
        <div class="location-info">
          <p class="location-name">${mainName || location.name}</p>
          <p class="location-address">${subName || location.name}</p>
        </div>
      `;

      locationItem.addEventListener('click', () => {
        // 移动地图到该位置
        if (location.bbox) {
          map.fitBounds(location.bbox);
        } else {
          map.setView([location.center.lat, location.center.lng], 16);
        }
      });

      locationSection.appendChild(locationItem);
    });

    animeList.appendChild(locationSection);
  } else if (searchResults.locations === undefined) {
    // 如果地图位置搜索失败，显示错误信息
    const locationSection = document.createElement('div');
    locationSection.className = 'search-section';
    locationSection.innerHTML = '<h6 class="search-category">地图位置</h6>';
    
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = '地图位置搜索失败，请重试';
    locationSection.appendChild(noResults);
    
    animeList.appendChild(locationSection);
  }

  // 如果没有任何结果，显示提示信息
  if (animeList.children.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = '没有找到匹配的结果';
    animeList.appendChild(noResults);
  }
}

// 创建地理位置列表项
function createLocationListItem(result) {
  const item = document.createElement('div');
  item.className = 'location-item';
  
  item.innerHTML = `
    <div class="location-info">
      <p class="location-name">${result.name}</p>
      <p class="location-address">${result.display_name}</p>
    </div>
  `;

  item.addEventListener('click', () => {
    // 移动地图到该位置
    map.setView([result.center.lat, result.center.lng], 16);
    
    // 添加临时标记
    const marker = L.marker([result.center.lat, result.center.lng])
      .addTo(map)
      .bindPopup(result.display_name)
      .openPopup();

    // 60秒后移除标记
    setTimeout(() => {
      map.removeLayer(marker);
    }, 60000);
  });

  return item;
}

// 创建巡礼点列表项
// 创建番剧列表项
function createAnimeListItem(id, anime) {
  const animeItem = document.createElement('div');
  animeItem.className = 'anime-item';
  animeItem.dataset.id = id;
  
  // 如果是当前选中的番剧，添加active类
  if (currentAnime === id) {
    animeItem.classList.add('active');
  }
  
  let pointsCount = 0;
  if (anime.points && Array.isArray(anime.points)) {
    pointsCount = anime.points.length;
  } else if (anime.inform) {
    pointsCount = '待加载';
  }
  
  animeItem.innerHTML = `
    <img class="anime-cover" src="loading.svg" data-src="${anime.cover || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
    <div class="anime-info">
      <p class="anime-name">${anime.name_cn || anime.name}</p>
      <p class="anime-points">${pointsCount} ${typeof pointsCount === 'number' ? '个地点' : ''}</p>
    </div>
  `;
  
  animeItem.addEventListener('click', () => {
    selectAnime(id);
  });
  
  return animeItem;
}

function createPointListItem(point, animeId, anime) {
  const item = document.createElement('div');
  item.className = 'point-item';
  
  item.innerHTML = `
    <img class="point-cover" src="loading.svg" data-src="${point.image || 'loading.svg'}" alt="${point.cn || point.name}">
    <div class="point-info">
      <p class="point-name">${point.cn || point.name}</p>
      <p class="anime-title">${anime.name_cn || anime.name}</p>
    </div>
  `;

  item.addEventListener('click', () => {
    if (point.geo && point.geo.length === 2) {
      map.setView(point.geo, 16);
      showPointInfo(point, anime, animeId);
    }
  });
  
  // 加载图片
  const img = item.querySelector('.point-cover');
  if (img && img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  }

  return item;
}

// 绑定搜索事件
searchButton.addEventListener('click', async () => {
  const searchText = searchInput.value.trim();
  if (searchText) {
    showLoader();
    try {
      const results = await searchAnimeAndPoints(searchText);
      renderSearchResults(results);
    } catch (error) {
      console.error('搜索出错:', error);
    } finally {
      hideLoader();
    }
  }
});
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// 加载用户指南数据
function loadGuides() {
  try {
    const savedGuides = localStorage.getItem('userGuides');
    if (savedGuides) {
      guides = JSON.parse(savedGuides);
    }
  } catch (error) {
    console.error('Error loading guides:', error);
    guides = [];
  }
}

// 保存用户指南数据到本地存储
function saveGuides() {
  try {
    localStorage.setItem('userGuides', JSON.stringify(guides));
  } catch (error) {
    console.error('Error saving guides:', error);
  }
}

// 渲染指南列表
function renderGuideList() {
  const guideList = document.getElementById('guide-list');
  guideList.innerHTML = '';
  
  if (guides.length === 0) {
    guideList.innerHTML = `
      <div class="no-results">
        <i class="bi bi-bookmark text-muted fs-4"></i>
        <p>您还没有创建指南</p>
      </div>
    `;
    return;
  }
  
  guides.forEach(guide => {
    const guideItem = createGuideListItem(guide);
    guideList.appendChild(guideItem);
  });
}

// 创建指南列表项
function createGuideListItem(guide) {
  const guideItem = document.createElement('div');
  guideItem.className = 'guide-item';
  guideItem.dataset.guideId = guide.id;
  
  if (currentGuide === guide.id) {
    guideItem.classList.add('active');
  }
  
  guideItem.innerHTML = `
    <div class="guide-icon" style="background-color: ${guide.color}20; color: ${guide.color};">
      <i class="bi bi-bookmark"></i>
    </div>
    <div class="guide-info">
      <h6 class="guide-name">${guide.name}</h6>
      <p class="guide-points">${guide.points.length} 个地点</p>
    </div>
  `;
  
  guideItem.addEventListener('click', () => {
    openGuideDetails(guide.id);
  });
  
  return guideItem;
}

// 创建新指南
function createNewGuide(name, description, color) {
  const newGuide = {
    id: 'guide_' + Date.now(),
    name: name,
    description: description || '',
    color: color || '#3388ff',
    points: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  guides.push(newGuide);
  saveGuides();
  renderGuideList();
  
  return newGuide;
}

// 添加巡礼点到指南
function addPointToGuide(guideId, point, anime, animeId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return false;
  
  // 检查点是否已经存在于指南中
  const existingPoint = guide.points.find(p => p.id === point.id);
  if (existingPoint) return false;
  
  // 创建要添加到指南的点对象
  const guidePoint = {
    id: point.id,
    name: point.name,
    lat: point.lat,
    lng: point.lng,
    image: point.image,
    animeId: animeId,
    animeName: anime.title,
    episode: point.episode || '',
    order: guide.points.length + 1
  };
  
  guide.points.push(guidePoint);
  guide.updated = new Date().toISOString();
  saveGuides();
  
  // 如果当前正在查看该指南，更新显示
  if (currentMode === 'guide' && currentGuide === guideId) {
    showGuideMarkers(guideId);
  }
  
  return true;
}

// 从指南中移除巡礼点
function removePointFromGuide(guideId, pointId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return false;
  
  const pointIndex = guide.points.findIndex(p => p.id === pointId);
  if (pointIndex === -1) return false;
  
  guide.points.splice(pointIndex, 1);
  
  // 重新排序
  guide.points.forEach((point, index) => {
    point.order = index + 1;
  });
  
  guide.updated = new Date().toISOString();
  saveGuides();
  
  // 如果当前正在查看该指南，更新显示
  if (currentMode === 'guide' && currentGuide === guideId) {
    showGuideMarkers(guideId);
  }
  
  return true;
}

// 更新指南信息
function updateGuide(guideId, name, description, color) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return false;
  
  guide.name = name;
  guide.description = description;
  guide.color = color;
  guide.updated = new Date().toISOString();
  
  saveGuides();
  renderGuideList();
  
  // 如果当前正在查看该指南，更新显示
  if (currentMode === 'guide' && currentGuide === guideId) {
    showGuideMarkers(guideId);
  }
  
  return true;
}

// 删除指南
function deleteGuide(guideId) {
  const guideIndex = guides.findIndex(g => g.id === guideId);
  if (guideIndex === -1) return false;
  
  guides.splice(guideIndex, 1);
  saveGuides();
  renderGuideList();
  
  // 如果当前正在查看该指南，切换回全部模式
  if (currentMode === 'guide' && currentGuide === guideId) {
    setMode('all');
  }
  
  return true;
}

// 打开指南详情
function openGuideDetails(guideId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return;
  
  const modal = document.getElementById('guide-details-modal');
  const modalTitle = document.getElementById('guide-details-modal-label');
  const guideName = document.getElementById('guide-detail-name');
  const guideDescription = document.getElementById('guide-detail-description');
  const guidePointsCount = document.getElementById('guide-points-count');
  const guidePointsList = document.getElementById('guide-points-list');
  const guideEmptyMessage = document.getElementById('guide-empty-message');
  
  modalTitle.textContent = '指南详情';
  guideName.textContent = guide.name;
  guideDescription.textContent = guide.description || '暂无描述';
  guidePointsCount.textContent = guide.points.length;
  
  // 渲染指南中的巡礼点
  guidePointsList.innerHTML = '';
  
  if (guide.points.length === 0) {
    guideEmptyMessage.classList.remove('d-none');
  } else {
    guideEmptyMessage.classList.add('d-none');
    
    guide.points.forEach((point, index) => {
      const pointItem = document.createElement('div');
      pointItem.className = 'guide-point-item';
      pointItem.innerHTML = `
        <div class="point-number" style="background-color: ${guide.color};">${index + 1}</div>
        <img class="point-image" src="${point.image || 'placeholder.jpg'}" alt="${point.name}">
        <div class="point-info">
          <h6 class="point-name">${point.name}</h6>
          <p class="point-anime">${point.animeName}</p>
        </div>
        <div class="point-actions">
          <button class="btn btn-sm btn-outline-danger remove-point-btn" data-point-id="${point.id}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `;
      guidePointsList.appendChild(pointItem);
    });
    
    // 绑定移除巡礼点按钮事件
    guidePointsList.querySelectorAll('.remove-point-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pointId = e.currentTarget.dataset.pointId;
        removePointFromGuide(guide.id, pointId);
        openGuideDetails(guide.id); // 刷新详情
      });
    });
  }
  
  // 绑定编辑、删除和分享按钮事件
  document.getElementById('edit-guide-btn').onclick = () => openEditGuideModal(guide.id);
  document.getElementById('delete-guide-btn').onclick = () => confirmDeleteGuide(guide.id);
  document.getElementById('share-guide-btn').onclick = () => openShareGuideModal(guide.id);
  
  // 绑定规划行程按钮事件
  document.getElementById('plan-guide-btn').onclick = () => planGuideTrip(guide.id);
  
  // 绑定优化路线按钮事件
  document.getElementById('optimize-route-btn').onclick = () => optimizeGuideRoute(guide.id);
  
  // 在地图上显示指南标记点
  document.getElementById('mode-guide').click();
  currentGuide = guide.id;
  
  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 打开创建指南模态框
function openCreateGuideModal() {
  const modal = document.getElementById('create-guide-modal');
  const form = document.getElementById('create-guide-form');
  
  // 重置表单
  form.reset();
  
  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 打开编辑指南模态框
function openEditGuideModal(guideId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return;
  
  const modal = document.getElementById('edit-guide-modal');
  const nameInput = document.getElementById('edit-guide-name');
  const descriptionInput = document.getElementById('edit-guide-description');
  const colorInput = document.getElementById('edit-guide-color');
  
  // 填充表单
  nameInput.value = guide.name;
  descriptionInput.value = guide.description || '';
  colorInput.value = guide.color;
  
  // 绑定保存按钮事件
  document.getElementById('update-guide-btn').onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('请输入指南名称');
      return;
    }
    
    updateGuide(guide.id, name, descriptionInput.value.trim(), colorInput.value);
    
    // 关闭模态框
    bootstrap.Modal.getInstance(modal).hide();
    
    // 刷新指南详情
    openGuideDetails(guide.id);
  };
  
  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 确认删除指南
function confirmDeleteGuide(guideId) {
  if (confirm('确定要删除此指南吗？此操作无法撤销。')) {
    const result = deleteGuide(guideId);
    if (result) {
      // 关闭指南详情模态框
      const modal = document.getElementById('guide-details-modal');
      bootstrap.Modal.getInstance(modal).hide();
    }
  }
}

// 打开添加到指南模态框
function openAddToGuideModal(point, anime, animeId) {
  const modal = document.getElementById('add-to-guide-modal');
  const guideSelectionList = document.getElementById('guide-selection-list');
  
  // 清空列表
  guideSelectionList.innerHTML = '';
  
  if (guides.length === 0) {
    guideSelectionList.innerHTML = `
      <div class="alert alert-info mb-0">
        您还没有创建指南，请先创建一个指南。
      </div>
    `;
  } else {
    guides.forEach(guide => {
      const listItem = document.createElement('button');
      listItem.className = 'list-group-item list-group-item-action d-flex align-items-center';
      listItem.innerHTML = `
        <div style="width: 24px; height: 24px; background-color: ${guide.color}; border-radius: 50%; margin-right: 10px;"></div>
        <div>
          <div class="fw-bold">${guide.name}</div>
          <small class="text-muted">${guide.points.length} 个地点</small>
        </div>
      `;
      
      // 检查点是否已在该指南中
      const existingPoint = guide.points.find(p => p.id === point.id);
      if (existingPoint) {
        listItem.classList.add('disabled');
        listItem.innerHTML += `
          <div class="ms-auto">
            <span class="badge bg-success">已添加</span>
          </div>
        `;
      } else {
        listItem.onclick = () => {
          addPointToGuide(guide.id, point, anime, animeId);
          bootstrap.Modal.getInstance(modal).hide();
          showToast(`已将 ${point.name} 添加到指南 ${guide.name}`);
        };
      }
      
      guideSelectionList.appendChild(listItem);
    });
  }
  
  // 绑定创建新指南按钮事件
  document.getElementById('new-guide-for-point-btn').onclick = () => {
    // 关闭当前模态框
    bootstrap.Modal.getInstance(modal).hide();
    
    // 打开创建指南模态框，并在创建后添加该点
    openCreateGuideModal();
    const saveGuideBtn = document.getElementById('save-guide-btn');
    const originalOnClick = saveGuideBtn.onclick;
    
    saveGuideBtn.onclick = () => {
      const result = originalOnClick ? originalOnClick() : null;
      const nameInput = document.getElementById('guide-name');
      const descriptionInput = document.getElementById('guide-description');
      const colorInput = document.getElementById('guide-color');
      
      const name = nameInput.value.trim();
      if (!name) return;
      
      const newGuide = createNewGuide(name, descriptionInput.value.trim(), colorInput.value);
      if (newGuide) {
        addPointToGuide(newGuide.id, point, anime, animeId);
        showToast(`已将 ${point.name} 添加到新指南 ${newGuide.name}`);
      }
      
      // 恢复原始事件处理
      saveGuideBtn.onclick = originalOnClick;
    };
  };
  
  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 打开分享指南模态框
function openShareGuideModal(guideId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return;
  
  const modal = document.getElementById('share-guide-modal');
  const shareLinkInput = document.getElementById('share-link-input');
  const qrcodeContainer = document.getElementById('qrcode-container');
  
  // 生成分享链接
  const shareLink = generateGuideShareLink(guide);
  shareLinkInput.value = shareLink;
  
  // 生成二维码
  qrcodeContainer.innerHTML = '';
  QRCode.toCanvas(document.createElement('canvas'), shareLink, { width: 200 }, function(error, canvas) {
    if (error) {
      console.error('Error generating QR code:', error);
      return;
    }
    qrcodeContainer.appendChild(canvas);
  });
  
  // 绑定复制按钮事件
  document.getElementById('copy-link-btn').onclick = () => {
    shareLinkInput.select();
    document.execCommand('copy');
    showToast('链接已复制到剪贴板');
  };
  
  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 生成指南分享链接
function generateGuideShareLink(guide) {
  // 创建一个仅包含必要信息的对象
  const exportGuide = {
    id: guide.id,
    name: guide.name,
    description: guide.description,
    color: guide.color,
    points: guide.points.map(point => ({
      id: point.id,
      name: point.name,
      lat: point.lat,
      lng: point.lng,
      image: point.image,
      animeId: point.animeId,
      animeName: point.animeName,
      episode: point.episode,
      order: point.order
    })),
    created: guide.created,
    updated: guide.updated
  };
  
  // 使用 base64 编码压缩后的 JSON
  const guideData = JSON.stringify(exportGuide);
  const compressedData = btoa(encodeURIComponent(guideData));
  
  // 构造 URL
  const currentUrl = window.location.href.split('?')[0];
  return `${currentUrl}?guide=${compressedData}`;
}

// 从 URL 解析参数
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const guideParam = urlParams.get('guide');
  
  if (guideParam) {
    try {
      const decodedData = decodeURIComponent(atob(guideParam));
      const importedGuide = JSON.parse(decodedData);
      
      // 打开导入指南模态框
      openImportGuideModal(importedGuide);
    } catch (error) {
      console.error('Error parsing guide data from URL:', error);
      showToast('无法解析指南数据，链接可能已损坏', 'danger');
    }
  }
}

// 打开导入指南模态框
function openImportGuideModal(importedGuide) {
  const modal = document.getElementById('import-guide-modal');
  const importGuideDetails = document.getElementById('import-guide-details');
  
  // 检查指南是否已存在
  const existingGuide = guides.find(g => g.id === importedGuide.id);
  
  importGuideDetails.innerHTML = `
    <div class="import-guide-header">
      <div class="import-guide-icon" style="background-color: ${importedGuide.color}20; color: ${importedGuide.color};">
        <i class="bi bi-bookmark"></i>
      </div>
      <div>
        <h5 class="import-guide-title">${importedGuide.name}</h5>
        <div class="import-guide-meta">
          ${importedGuide.points.length} 个地点 · 更新于 ${new Date(importedGuide.updated).toLocaleDateString()}
        </div>
      </div>
    </div>
    
    <div class="import-guide-description">
      ${importedGuide.description || '暂无描述'}
    </div>
    
    <h6>包含的巡礼点 (${importedGuide.points.length})</h6>
    <div class="import-guide-points">
      ${importedGuide.points.map((point, index) => `
        <div class="import-point-item">
          <div class="import-point-number" style="background-color: ${importedGuide.color};">${index + 1}</div>
          <div>
            <h6 class="import-point-name">${point.name}</h6>
            <p class="import-point-anime">${point.animeName}</p>
          </div>
        </div>
      `).join('')}
    </div>
    ${existingGuide ? '<div class="alert alert-warning mt-3">您已经有一个相同 ID 的指南，导入将覆盖现有指南。</div>' : ''}
  `;
  
  // 绑定导入按钮事件
  document.getElementById('confirm-import-btn').onclick = () => {
    importGuide(importedGuide);
    bootstrap.Modal.getInstance(modal).hide();
  };
  
  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 导入指南
function importGuide(importedGuide) {
  // 检查指南是否已存在
  const existingIndex = guides.findIndex(g => g.id === importedGuide.id);
  
  if (existingIndex !== -1) {
    // 覆盖现有指南
    guides[existingIndex] = importedGuide;
  } else {
    // 添加新指南
    guides.push(importedGuide);
  }
  
  saveGuides();
  renderGuideList();
  showToast(`成功导入指南"${importedGuide.name}"`, 'success');
}

// 显示通知
function showToast(message, type = 'info') {
  // 创建一个 Bootstrap toast
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  toastContainer.style.zIndex = '1060';
  
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  document.body.appendChild(toastContainer);
  
  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();
  
  // 在 toast 隐藏后移除元素
  toast.addEventListener('hidden.bs.toast', () => {
    document.body.removeChild(toastContainer);
  });
}

// 显示指南路线和标记点
function showGuideMarkers(guideId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide) return;
  
  // 清除现有标记点
  clearMarkers();
  
  // 清除现有路径
  clearGuidePaths();
  
  // 没有点时直接返回
  if (guide.points.length === 0) return;
  
  // 创建标记点
  const bounds = L.latLngBounds();
  guide.points.forEach((point, index) => {
    const marker = createGuideMarker(point, index + 1, guide);
    markers.push(marker);
    bounds.extend([point.lat, point.lng]);
  });
  
  // 创建路径线
  if (guide.points.length > 1) {
    const pathCoords = guide.points.map(point => [point.lat, point.lng]);
    const guidePath = L.polyline(pathCoords, {
      color: guide.color,
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 10',
      className: 'guide-path'
    }).addTo(map);
    
    guidePaths.push(guidePath);
  }
  
  // 调整地图视野
  map.fitBounds(bounds, { padding: [50, 50] });
}

// 创建指南标记点
function createGuideMarker(point, number, guide) {
  const markerIcon = L.divIcon({
    className: 'guide-marker',
    html: `<div style="background-color: ${guide.color};">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
  
  const marker = L.marker([point.lat, point.lng], { icon: markerIcon }).addTo(map);
  
  // 点击标记点显示信息
  marker.on('click', () => {
    // 查找番剧数据
    const anime = animeData.find(a => a.id === point.animeId);
    if (anime) {
      showPointInfo({
        id: point.id,
        name: point.name,
        lat: point.lat,
        lng: point.lng,
        image: point.image,
        episode: point.episode
      }, anime, point.animeId);
    }
  });
  
  return marker;
}

// 清除指南路径
function clearGuidePaths() {
  guidePaths.forEach(path => {
    map.removeLayer(path);
  });
  guidePaths = [];
}

// 优化指南路线
function optimizeGuideRoute(guideId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide || guide.points.length <= 2) {
    showToast('需要至少3个巡礼点才能优化路线', 'warning');
    return;
  }
  
  // 使用贪心算法找最近邻点
  const optimizedPoints = [guide.points[0]]; // 从第一个点开始
  const unvisited = [...guide.points.slice(1)];
  
  while (unvisited.length > 0) {
    const lastPoint = optimizedPoints[optimizedPoints.length - 1];
    let nearestIndex = 0;
    let nearestDistance = getDistance(
      lastPoint.lat, lastPoint.lng,
      unvisited[0].lat, unvisited[0].lng
    );
    
    for (let i = 1; i < unvisited.length; i++) {
      const dist = getDistance(
        lastPoint.lat, lastPoint.lng,
        unvisited[i].lat, unvisited[i].lng
      );
      
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }
    
    optimizedPoints.push(unvisited[nearestIndex]);
    unvisited.splice(nearestIndex, 1);
  }
  
  // 更新顺序
  guide.points = optimizedPoints.map((point, index) => ({
    ...point,
    order: index + 1
  }));
  
  guide.updated = new Date().toISOString();
  saveGuides();
  
  // 刷新地图显示
  showGuideMarkers(guideId);
  
  // 刷新模态框内容
  openGuideDetails(guideId);
  
  showToast('路线已优化为最短距离', 'success');
}

// 计算两点之间的距离 (Haversine 公式)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 初始化L2D站娘
function initL2D() {
  // 显示L2D容器
  const l2dContainer = document.getElementById('l2d-container');
  l2dContainer.classList.remove('d-none');
  
  // 初始消息
  addL2DMessage('欢迎使用动漫圣地巡礼地图！我是您的巡礼助手，有什么可以帮您的吗？', 'assistant');
  
  // 加载L2D模型
  loadL2DModel();
  
  // 绑定事件
  document.getElementById('l2d-toggle-btn').addEventListener('click', toggleL2D);
  document.getElementById('l2d-send-btn').addEventListener('click', sendL2DMessage);
  document.getElementById('l2d-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendL2DMessage();
    }
  });
}

// 加载L2D模型
function loadL2DModel() {
  try {
    // 替换为实际的模型URL
    const modelUrl = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/examples/assets/shizuku/shizuku.model.json';
    const canvasContainer = document.querySelector('.l2d-canvas-container');
    
    // 创建canvas元素
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 250;
    canvasContainer.appendChild(canvas);
    
    // 这里只是一个占位的模拟加载模型的代码
    // 实际项目中需要替换为正确的Live2D加载代码
    console.log('L2D model would load here:', modelUrl);
    
    // 如果您有正确的Live2D SDK集成，可以启用下面的代码
    /* 
    loadLive2DModel(canvas, modelUrl).then(model => {
      // 模型加载成功后的处理
    }).catch(error => {
      console.error('Failed to load L2D model:', error);
    });
    */
  } catch (error) {
    console.error('Error initializing L2D model:', error);
  }
}

// 切换L2D站娘显示状态
function toggleL2D() {
  const l2dContainer = document.getElementById('l2d-container');
  l2dContainer.classList.toggle('minimized');
  
  const toggleBtn = document.getElementById('l2d-toggle-btn');
  if (l2dContainer.classList.contains('minimized')) {
    toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
  } else {
    toggleBtn.innerHTML = '<i class="bi bi-robot"></i>';
  }
}

// 添加消息到L2D聊天窗口
function addL2DMessage(message, sender) {
  const messagesContainer = document.getElementById('l2d-messages');
  const messageElement = document.createElement('div');
  messageElement.className = `l2d-message ${sender}`;
  messageElement.textContent = message;
  messagesContainer.appendChild(messageElement);
  
  // 滚动到底部
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息给L2D站娘
function sendL2DMessage() {
  const input = document.getElementById('l2d-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // 添加用户消息
  addL2DMessage(message, 'user');
  
  // 清空输入框
  input.value = '';
  
  // 处理用户消息并回复
  processL2DMessage(message);
}

// 处理L2D站娘消息
function processL2DMessage(message) {
  // 模拟加载状态
  setTimeout(() => {
    let response = '';
    
    // 简单的关键词匹配
    if (message.includes('你好') || message.includes('嗨') || message.includes('hi')) {
      response = '你好！我是你的巡礼助手。我可以帮你规划行程，提供旅游信息，或者解答关于动漫圣地巡礼的问题。';
    } else if (message.includes('指南') || message.includes('巡礼')) {
      response = '您可以在侧边栏的"指南"标签页创建自己的巡礼指南，或者在地图上选择感兴趣的巡礼点添加到指南中。创建指南后，您可以优化路线或者让我帮您规划行程。';
    } else if (message.includes('规划') || message.includes('行程') || message.includes('路线')) {
      response = '要规划行程，请先创建一个包含您想要访问的巡礼点的指南，然后点击"使用AI规划行程"按钮。我会根据地理位置和交通情况，为您生成最优的巡礼路线和时间安排。';
    } else if (message.includes('分享')) {
      response = '您可以通过指南详情页面的"分享"按钮生成分享链接或二维码，将您的指南分享给朋友。他们可以直接导入您的指南，无需重新创建。';
    } else if (message.includes('谢谢') || message.includes('感谢')) {
      response = '不客气！祝您巡礼愉快！如果有其他问题，随时问我。';
    } else {
      response = '抱歉，我还不太理解您的问题。您可以问我关于指南创建、行程规划、巡礼地点等方面的问题，我会尽力帮助您。';
    }
    
    // 添加助手回复
    addL2DMessage(response, 'assistant');
  }, 800);
}

// 规划指南行程
function planGuideTrip(guideId) {
  const guide = guides.find(g => g.id === guideId);
  if (!guide || guide.points.length === 0) {
    showToast('指南中没有巡礼点，无法规划行程', 'warning');
    return;
  }
  
  // 展开L2D站娘
  const l2dContainer = document.getElementById('l2d-container');
  l2dContainer.classList.remove('d-none', 'minimized');
  
  // 发送规划请求消息
  setTimeout(() => {
    addL2DMessage(`请帮我规划"${guide.name}"的巡礼行程，包含${guide.points.length}个地点。`, 'user');
    
    // 模拟AI生成中
    setTimeout(() => {
      addL2DMessage('正在为您规划行程...', 'assistant');
      
      // 模拟AI回复
      setTimeout(() => {
        // 生成一个简单的行程规划
        let tripPlan = `基于您的 "${guide.name}" 指南，我为您规划了以下巡礼行程：\n\n`;
        tripPlan += `第1天：\n`;
        
        let dayCounter = 1;
        let pointsPerDay = 3; // 每天3个点
        
        guide.points.forEach((point, index) => {
          if (index > 0 && index % pointsPerDay === 0) {
            dayCounter++;
            tripPlan += `\n第${dayCounter}天：\n`;
          }
          
          tripPlan += `- ${point.name} (${point.animeName})\n`;
        });
        
        tripPlan += `\n交通建议：可以选择公共交通或租车前往这些地点。要获取更详细的路线规划，请点击地图上的标记点，然后使用Google地图或苹果地图进行导航。\n\n`;
        tripPlan += `希望您有一个愉快的巡礼之旅！如果需要调整行程，请随时告诉我。`;
        
        addL2DMessage(tripPlan, 'assistant');
      }, 2000);
    }, 1000);
  }, 500);
}

// 在信息卡中显示巡礼点信息 (扩展现有函数)
function showPointInfo(point, anime, animeId) {
  // ... existing code ...
  
  // 显示信息卡
  const infoCard = document.getElementById('info-card');
  const pointImage = document.getElementById('point-image');
  const pointName = document.getElementById('point-name');
  const animeName = document.getElementById('anime-name');
  const episodeInfo = document.getElementById('episode-info');
  const googleMapsLink = document.getElementById('google-maps-link');
  const googleStreetviewLink = document.getElementById('google-streetview-link');
  const appleMapsLink = document.getElementById('apple-maps-link');
  const traceMoeLink = document.getElementById('trace-moe-link');
  const addToGuideBtn = document.getElementById('add-to-guide-btn');
  
  // 设置信息卡内容
  pointName.textContent = point.name;
  animeName.textContent = anime.title;
  episodeInfo.textContent = point.episode ? `第${point.episode}集` : '';
  
  // 设置地图链接
  let lat, lng;
  if (point.geo && Array.isArray(point.geo) && point.geo.length === 2) {
    [lat, lng] = point.geo;
    // 确保坐标有效
    if (typeof lat === 'number' && typeof lng === 'number') {
      googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      googleStreetviewLink.href = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
      appleMapsLink.href = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(point.cn || point.name)}`;
      
      // 显示地图链接
      googleMapsLink.style.display = 'inline-block';
      googleStreetviewLink.style.display = 'inline-block';
      appleMapsLink.style.display = 'inline-block';
    } else {
      // 坐标无效，隐藏地图链接
      googleMapsLink.style.display = 'none';
      googleStreetviewLink.style.display = 'none';
      appleMapsLink.style.display = 'none';
    }
  } else {
    // 无坐标数据，隐藏地图链接
    googleMapsLink.style.display = 'none';
    googleStreetviewLink.style.display = 'none';
    appleMapsLink.style.display = 'none';
  }
  
  // 设置图片
  if (point.image) {
    pointImage.src = point.image;
    pointImage.alt = point.name;
    traceMoeLink.href = `https://trace.moe/?url=${encodeURIComponent(point.image)}`;
    traceMoeLink.classList.remove('d-none');
  } else {
    pointImage.src = 'placeholder.jpg';
    pointImage.alt = '无图片';
    traceMoeLink.classList.add('d-none');
  }
  
  // 设置添加到指南按钮事件
  addToGuideBtn.onclick = () => {
    openAddToGuideModal(point, anime, animeId);
  };
  
  // 显示信息卡
  infoCard.classList.remove('d-none');
  
  // 绑定关闭按钮事件
  document.getElementById('close-info').onclick = () => {
    infoCard.classList.add('d-none');
  };
}

// 绑定事件 (扩展现有函数)
function bindEvents() {
  // ... existing code ...
  
  // 搜索按钮点击事件
  document.getElementById('search-button').addEventListener('click', handleSearch);
  document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  // 地图模式切换按钮事件
  document.getElementById('mode-all').addEventListener('click', function() {
    setMode('all');
  });
  
  document.getElementById('mode-single').addEventListener('click', function() {
    if (currentAnime) {
      setMode('single');
    } else {
      showToast('请先选择一个番剧', 'warning');
    }
  });
  
  document.getElementById('mode-guide').addEventListener('click', function() {
    if (currentGuideId) {
      setMode('guide');
    } else if (guides.length > 0) {
      // 如果有指南但未选中，打开第一个指南
      openGuideDetails(guides[0].id);
    } else {
      showToast('请先创建一个指南', 'warning');
    }
  });
  
  // 侧边栏切换按钮事件
  document.getElementById('toggle-sidebar').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('show');
  });
  
  // 创建指南按钮事件
  document.getElementById('create-guide-btn').addEventListener('click', openCreateGuideModal);
  
  // 保存指南按钮事件
  document.getElementById('save-guide-btn').addEventListener('click', function() {
    const nameInput = document.getElementById('guide-name');
    const descriptionInput = document.getElementById('guide-description');
    const colorInput = document.getElementById('guide-color');
    
    const name = nameInput.value.trim();
    if (!name) {
      alert('请输入指南名称');
      return;
    }
    
    createNewGuide(name, descriptionInput.value.trim(), colorInput.value);
    
    // 关闭模态框
    const modal = document.getElementById('create-guide-modal');
    bootstrap.Modal.getInstance(modal).hide();
    
    showToast(`成功创建指南 "${name}"`, 'success');
  });
  
  // 监听地图移动事件，更新可见标记点
  map.on('moveend', debounceUpdateMarkers);
  map.on('zoomend', debounceUpdateMarkers);
}

// 设置地图模式 (扩展现有函数)
async function setMode(mode) {
  currentMode = mode;
  
  // 更新模式按钮状态
  document.getElementById('mode-all').classList.toggle('active', mode === 'all');
  document.getElementById('mode-all').classList.toggle('btn-primary', mode === 'all');
  document.getElementById('mode-all').classList.toggle('btn-outline-primary', mode !== 'all');
  
  document.getElementById('mode-single').classList.toggle('active', mode === 'single');
  document.getElementById('mode-single').classList.toggle('btn-primary', mode === 'single');
  document.getElementById('mode-single').classList.toggle('btn-outline-primary', mode !== 'single');
  
  document.getElementById('mode-guide').classList.toggle('active', mode === 'guide');
  document.getElementById('mode-guide').classList.toggle('btn-primary', mode === 'guide');
  document.getElementById('mode-guide').classList.toggle('btn-outline-primary', mode !== 'guide');
  
  // 根据模式显示相应的标记点
  clearMarkers();
  
  switch (mode) {
    case 'all':
      await addAllMarkers();
      break;
    case 'single':
      if (currentAnime) {
        await addSingleAnimeMarkers(currentAnime);
      }
      break;
    case 'guide':
      if (currentGuideId) {
        showGuideMarkers(currentGuideId);
      }
      break;
  }
}
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
let currentMapSource = 'osmHOT'; // 当前地图源
let guides = []; // 用户创建的指南列表
let guidePaths = []; // 指南路径线图层
let animeExpandActivated = false; // 番剧列表是否已激活展开加载功能
let apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'www.302800.xyz'; // API基础URL
let userLocationMarker = null; // 用户当前位置标记
let userLocationCircle = null; // 用户当前位置精度圆圈
let locationWatchId = null; // 位置监听器ID
let isLocationActive = false; // 定位是否激活

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
const toggleCommentsBtn = document.getElementById('toggle-comments-btn');
const commentsContainer = document.getElementById('comments-container');

// 导航元素
const sidebarNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
const contentPanels = document.querySelectorAll('.content-panel');
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

// 模式切换按钮
const modeAllBtn = document.getElementById('mode-all');
const modeSingleBtn = document.getElementById('mode-single');
const modeGuideBtn = document.getElementById('mode-guide');

// 更新模式按钮状态
function updateModeButtons() {
  // 更新所有按钮的状态
  modeAllBtn.classList.toggle('active', currentMode === 'all');
  modeAllBtn.classList.toggle('btn-primary', currentMode === 'all');
  modeAllBtn.classList.toggle('btn-outline-primary', currentMode !== 'all');

  modeSingleBtn.classList.toggle('active', currentMode === 'single');
  modeSingleBtn.classList.toggle('btn-primary', currentMode === 'single');
  modeSingleBtn.classList.toggle('btn-outline-primary', currentMode !== 'single');

  modeGuideBtn.classList.toggle('active', currentMode === 'guide');
  modeGuideBtn.classList.toggle('btn-primary', currentMode === 'guide');
  modeGuideBtn.classList.toggle('btn-outline-primary', currentMode !== 'guide');
}

// 初始化函数
async function init() {
  showLoader();
  try {
    // 初始化设置
    initSettings();
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

    // 初始化附近巡礼点封面功能
    if (typeof window.initNearbyCovers === 'function') {
      window.initNearbyCovers();
    }

    // 初始化标记点密度过滤功能
    if (typeof window.initMarkerDensityFilter === 'function') {
      window.initMarkerDensityFilter();
    }

    // 初始化标记点聚合功能
    if (typeof window.initMarkerCluster === 'function') {
      window.initMarkerCluster();
    }

    // 从URL解析参数
    parseUrlParams();

    // 通知移动端初始化
    window.mainScriptInitialized = true;

    // 触发一个自定义事件，通知移动端脚本数据已加载完成
    document.dispatchEvent(new CustomEvent('animeDataLoaded', {
      detail: { animeCount: Object.keys(allAnimeData).length }
    }));

    // 直接调用移动端初始化函数
    if (typeof window.initMobile === 'function') {
      window.initMobile();
    }
  } catch (error) {
    console.error('初始化失败:', error);
    alert('加载数据失败，请刷新页面重试');
  } finally {
    hideLoader();
  }
}

// 初始化地图
function initMap() {
  // 创建地图，初始中心设在日本，并禁用默认的缩放控件
  map = L.map('map', {
    zoomControl: false // 禁用默认的缩放控件
  }).setView([35.6762, 139.6503], 6);

  // 将地图对象暴露到全局作用域，以便其他模块可以访问
  window.map = map;

  // 从localStorage获取上次选择的底图类型
  const savedMapSource = localStorage.getItem('mapSource');
  if (savedMapSource && mapSources[savedMapSource]) {
    currentMapSource = savedMapSource;
  }

  // 添加地图图层，使用当前选择的地图源
  const source = mapSources[currentMapSource];
  L.tileLayer(source.url, source.options).addTo(map);

  // 添加自定义位置的缩放控件
  L.control.zoom({
    position: 'bottomleft',
    zoomInTitle: '放大',
    zoomOutTitle: '缩小'
  }).addTo(map);

  // 添加定位按钮
  addLocationControl();

  // 添加随机传送按钮
  addRandomTeleportControl();

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

    // 保存用户选择的底图到localStorage
    localStorage.setItem('mapSource', sourceName);

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

      // 创建模态框
      const modal = L.DomUtil.create('div', 'map-source-modal', document.body);
      const content = L.DomUtil.create('div', 'map-source-content', modal);

      // 添加模态框头部
      const header = L.DomUtil.create('div', 'map-source-header', content);
      const title = L.DomUtil.create('h3', 'map-source-title', header);
      title.textContent = '选择地图源';

      const closeBtn = L.DomUtil.create('button', 'map-source-close', header);
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';

      // 将地图源分类
      const categories = {
        'standard': { title: '标准地图', icon: 'bi-map', sources: [] },
        'satellite': { title: '卫星影像', icon: 'bi-globe', sources: [] },
        'special': { title: '特色地图', icon: 'bi-stars', sources: [] }
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
          const categoryTitle = L.DomUtil.create('div', 'map-source-category', content);
          categoryTitle.innerHTML = `<i class="bi ${category.icon}"></i> ${category.title}`;

          // 创建网格容器
          const grid = L.DomUtil.create('div', 'map-source-grid', content);

          // 添加该分类下的地图源
          category.sources.forEach(({ key, source }) => {
            const option = L.DomUtil.create('div', 'map-source-option', grid);
            option.dataset.source = key;

            // 添加图标
            const icon = L.DomUtil.create('div', 'map-source-icon', option);
            icon.innerHTML = `<i class="bi ${category.icon}"></i>`;

            // 添加名称
            const name = L.DomUtil.create('div', 'map-source-name', option);
            name.textContent = source.name;

            if (key === currentMapSource) {
              option.classList.add('active');
            }

            L.DomEvent.on(option, 'click', function(e) {
              L.DomEvent.preventDefault(e);
              L.DomEvent.stopPropagation(e);
              changeMapSource(key);
              modal.classList.remove('show');
            });
          });
        }
      });

      // 打开模态框
      L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        modal.classList.add('show');
      });

      // 关闭模态框
      L.DomEvent.on(closeBtn, 'click', function() {
        modal.classList.remove('show');
      });

      // 点击模态框外部关闭
      L.DomEvent.on(modal, 'click', function(e) {
        if (e.target === modal) {
          modal.classList.remove('show');
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

  // 添加地图移动和缩放事件监听 - 使用防抖处理
  map.on('movestart', () => {
    isMapMoving = true;
    // 显示右上角加载提示
    showTipLoader();
  });

  map.on('moveend', () => {
    isMapMoving = false;
    // 使用防抖函数处理地图移动结束事件
    debounceUpdateMarkers();
  });

  map.on('zoomstart', () => {
    isMapMoving = true;
    // 显示右上角加载提示
    showTipLoader();
  });

  map.on('zoomend', () => {
    isMapMoving = false;
    // 使用防抖函数处理缩放结束事件
    debounceUpdateMarkers();
  });
}

// 添加定位控件
function addLocationControl() {
  // 创建自定义定位控件
  const locationControl = L.control({ position: 'bottomleft' });

  locationControl.onAdd = function() {
    // 创建控件容器
    const container = L.DomUtil.create('div', 'leaflet-control-locate leaflet-bar leaflet-control');

    // 创建定位按钮
    const button = L.DomUtil.create('a', 'leaflet-control-locate-button', container);
    button.href = '#';
    button.title = '定位到当前位置';
    button.innerHTML = '<i class="bi bi-geo-alt"></i>';
    button.role = 'button';
    button.setAttribute('aria-label', '定位到当前位置');

    // 添加点击事件
    L.DomEvent.on(button, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      toggleLocationTracking();
    });

    return container;
  };

  // 添加到地图
  locationControl.addTo(map);
}

// 切换位置跟踪状态
function toggleLocationTracking() {
  if (isLocationActive) {
    // 如果已经激活，停止跟踪
    stopLocationTracking();
  } else {
    // 如果未激活，开始跟踪
    startLocationTracking();
  }
}

// 开始位置跟踪
function startLocationTracking() {
  // 检查浏览器是否支持地理定位
  if (!navigator.geolocation) {
    showToast('您的浏览器不支持地理定位功能', 'error');
    console.error('浏览器不支持地理定位');
    return;
  }

  // 更新按钮状态
  const button = document.querySelector('.leaflet-control-locate-button');
  if (button) {
    button.classList.add('active');
  }

  // 设置激活状态
  isLocationActive = true;

  // 显示加载提示
  showToast('正在获取您的位置...', 'info');
  console.log('开始获取用户位置');

  // 尝试使用IP定位作为备选方案
  tryIpBasedLocation();

  // 先尝试单次定位，如果成功再开始连续跟踪
  navigator.geolocation.getCurrentPosition(
    // 单次定位成功回调
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log('单次定位成功:', latitude, longitude, accuracy);

      // 更新用户位置标记
      updateUserLocationMarker(latitude, longitude, accuracy);

      // 移动地图到用户位置
      map.setView([latitude, longitude], 16);

      // 显示成功提示
      showToast('定位成功，开始实时跟踪您的位置', 'success');

      // 开始连续跟踪
      startContinuousTracking();
    },
    // 单次定位错误回调
    (error) => {
      console.error('单次定位错误:', error);

      // 显示错误信息
      let errorMsg = '无法获取您的位置';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = '您拒绝了定位请求，请允许浏览器获取位置信息';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = '当前位置信息不可用，尝试使用IP定位';
          break;
        case error.TIMEOUT:
          errorMsg = '获取位置超时，尝试使用IP定位';
          break;
        default:
          errorMsg = `定位错误 (${error.code}): ${error.message}`;
      }

      showToast(errorMsg, 'warning');

      // 尝试开始连续跟踪，作为备选方案
      startContinuousTracking();
    },
    // 单次定位选项 - 降低精度要求，增加超时时间
    {
      enableHighAccuracy: false, // 不要求高精度，提高成功率
      timeout: 10000,          // 增加超时时间到 10 秒
      maximumAge: 60000        // 允许使用最近 1 分钟的缓存位置
    }
  );
}

// 尝试使用IP定位
// 注意：这个方法仅作为备选方案，精度不高
// 使用免费的 IP 定位 API
function tryIpBasedLocation() {
  console.log('尝试使用IP定位');

  // 尝试使用多个不同的 IP 定位 API
  tryMultipleIpApis();

  // 使用默认位置作为最终备选方案
  // 东京坐标，作为默认位置
  const defaultLatitude = 35.6762;
  const defaultLongitude = 139.6503;
  const defaultAccuracy = 50000; // 50公里精度，表示这是一个非常粗略的位置

  // 如果还没有设置用户位置，则使用默认位置
  if (!userLocationMarker) {
    console.log('使用默认位置作为备选');

    // 更新用户位置标记
    updateUserLocationMarker(defaultLatitude, defaultLongitude, defaultAccuracy, true);

    // 移动地图到默认位置
    map.setView([defaultLatitude, defaultLongitude], 6); // 缩放级别设置很小，因为这是一个非常粗略的位置

    // 显示提示
    showToast('无法获取您的位置，已将地图定位到默认位置', 'info');
  }
}

// 尝试多个 IP 定位 API
function tryMultipleIpApis() {
  // 尝试第一个 API: geoiplookup.io
  try {
    // 使用 JSONP 方式请求，避免 CORS 限制
    const script1 = document.createElement('script');
    script1.id = 'ip-api-1';
    script1.src = 'https://json.geoiplookup.io/?callback=handleIpLocation1';
    document.body.appendChild(script1);

    // 定义回调函数
    window.handleIpLocation1 = function(data) {
      console.log('IP 定位 API 1 响应:', data);

      // 检查是否有效响应
      if (data && data.success !== false && data.latitude && data.longitude) {
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        const accuracy = 10000; // IP 定位精度一般在城市级别，设置为 10 公里

        // 如果还没有设置用户位置，则使用 IP 定位结果
        if (!userLocationMarker) {
          console.log('使用 IP 定位 API 1 结果');

          // 更新用户位置标记
          updateUserLocationMarker(latitude, longitude, accuracy, true);

          // 移动地图到用户位置
          map.setView([latitude, longitude], 10); // 缩放级别设置小一些，因为 IP 定位精度低

          // 显示提示
          showToast('使用网络定位作为备选，精度较低', 'info');
        }

        // 清除脚本标签
        removeScriptTag('ip-api-1');
        return; // 如果成功就不继续尝试其他 API
      } else {
        console.log('IP 定位 API 1 失败，尝试下一个 API');
        removeScriptTag('ip-api-1');
        tryIpApi2(); // 尝试下一个 API
      }
    };

    // 设置超时处理
    setTimeout(() => {
      if (document.getElementById('ip-api-1')) {
        console.log('IP 定位 API 1 超时');
        removeScriptTag('ip-api-1');
        tryIpApi2(); // 尝试下一个 API
      }
    }, 3000);
  } catch (error) {
    console.error('IP 定位 API 1 错误:', error);
    tryIpApi2(); // 尝试下一个 API
  }
}

// 尝试第二个 IP 定位 API
function tryIpApi2() {
  try {
    // 使用另一个 IP 定位 API
    const script2 = document.createElement('script');
    script2.id = 'ip-api-2';
    script2.src = 'https://get.geojs.io/v1/ip/geo.js'; // 另一个免费的 IP 定位 API
    document.body.appendChild(script2);

    // 定义回调函数
    window.geoip = function(data) {
      console.log('IP 定位 API 2 响应:', data);

      // 检查是否有效响应
      if (data && data.latitude && data.longitude) {
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        const accuracy = 10000; // IP 定位精度一般在城市级别，设置为 10 公里

        // 如果还没有设置用户位置，则使用 IP 定位结果
        if (!userLocationMarker) {
          console.log('使用 IP 定位 API 2 结果');

          // 更新用户位置标记
          updateUserLocationMarker(latitude, longitude, accuracy, true);

          // 移动地图到用户位置
          map.setView([latitude, longitude], 10);

          // 显示提示
          showToast('使用网络定位作为备选，精度较低', 'info');
        }

        // 清除脚本标签
        removeScriptTag('ip-api-2');
      } else {
        console.log('IP 定位 API 2 失败');
        removeScriptTag('ip-api-2');
      }
    };

    // 设置超时处理
    setTimeout(() => {
      if (document.getElementById('ip-api-2')) {
        console.log('IP 定位 API 2 超时');
        removeScriptTag('ip-api-2');
      }
    }, 3000);
  } catch (error) {
    console.error('IP 定位 API 2 错误:', error);
  }
}

// 移除脚本标签的辅助函数
function removeScriptTag(id) {
  const scriptTag = document.getElementById(id);
  if (scriptTag && scriptTag.parentNode) {
    scriptTag.parentNode.removeChild(scriptTag);
  }
}

// 开始连续位置跟踪
function startContinuousTracking() {
  console.log('开始连续位置跟踪');

  // 开始监听位置变化
  locationWatchId = navigator.geolocation.watchPosition(
    // 成功回调
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log('位置更新:', latitude, longitude, accuracy);

      // 更新用户位置标记
      updateUserLocationMarker(latitude, longitude, accuracy);
    },
    // 错误回调
    (error) => {
      console.error('连续定位错误:', error);
      let errorMsg = '无法获取您的位置';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = '您拒绝了定位请求，请允许浏览器获取位置信息';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = '当前位置信息不可用';
          break;
        case error.TIMEOUT:
          errorMsg = '获取位置超时';
          break;
      }

      // 仅显示一次错误提示，不停止跟踪
      // 因为我们已经有了默认位置作为备选
      showToast(errorMsg, 'warning');
    },
    // 选项 - 降低精度要求，提高成功率
    {
      enableHighAccuracy: false, // 不要求高精度，提高成功率
      maximumAge: 60000,        // 允许使用最近 1 分钟的缓存位置
      timeout: 15000            // 15秒超时，给予更多时间
    }
  );
}

// 停止位置跟踪
function stopLocationTracking() {
  // 清除监听
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }

  // 移除标记
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }

  // 移除精度圆圈
  if (userLocationCircle) {
    map.removeLayer(userLocationCircle);
    userLocationCircle = null;
  }

  // 更新按钮状态
  const button = document.querySelector('.leaflet-control-locate-button');
  if (button) {
    button.classList.remove('active');
  }

  // 重置状态
  isLocationActive = false;
}

// 更新用户位置标记
function updateUserLocationMarker(latitude, longitude, accuracy, isIpBased = false) {
  console.log('更新用户位置标记:', latitude, longitude, accuracy, isIpBased ? '(基于IP)' : '');

  // 如果标记已存在，移除它
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  // 如果精度圆圈已存在，移除它
  if (userLocationCircle) {
    map.removeLayer(userLocationCircle);
  }

  // 根据定位来源选择不同的样式
  let markerColor, markerSize, animationClass;

  if (isIpBased) {
    // IP定位使用橙色，表示精度较低
    markerColor = '#FF9800';
    markerSize = 20;
    animationClass = '';
  } else {
    // GPS定位使用蓝色，并添加脉动效果
    markerColor = '#4285F4';
    markerSize = 24;
    animationClass = 'animation: pulse 1.5s infinite;';
  }

  // 创建新的用户位置标记
  const icon = L.divIcon({
    className: 'user-location-marker',
    html: `<div style="width: ${markerSize}px; height: ${markerSize}px; background-color: ${markerColor}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); ${animationClass}"></div>`,
    iconSize: [markerSize, markerSize],
    iconAnchor: [markerSize/2, markerSize/2]
  });

  // 创建新的标记并添加到地图
  userLocationMarker = L.marker([latitude, longitude], { icon }).addTo(map);

  // 创建精度圆圈，根据定位来源选择不同的样式
  userLocationCircle = L.circle([latitude, longitude], {
    radius: accuracy,
    className: isIpBased ? 'ip-location-accuracy-circle' : 'user-location-accuracy-circle'
  }).addTo(map);

  // 格式化精度信息
  let accuracyText = accuracy.toFixed(0) + ' 米';
  if (accuracy > 1000) {
    accuracyText = (accuracy / 1000).toFixed(1) + ' 公里';
  }

  // 添加点击事件显示详细位置信息
  const popupContent = `
    <div class="location-popup">
      <h6>${isIpBased ? '您的大致位置 (基于IP)' : '您的当前位置'}</h6>
      <p><strong>经度:</strong> ${longitude.toFixed(6)}</p>
      <p><strong>纬度:</strong> ${latitude.toFixed(6)}</p>
      <p><strong>精度:</strong> ${accuracyText}</p>
      ${isIpBased ? '<p class="text-warning"><small>注意: IP定位精度较低，仅供参考</small></p>' : ''}
    </div>
  `;

  userLocationMarker.bindPopup(popupContent).openPopup();

  // 返回坐标对象，便于其他函数使用
  return { latitude, longitude, accuracy, isIpBased };
}

// 添加随机传送控件
function addRandomTeleportControl() {
  // 创建自定义随机传送控件
  const randomControl = L.control({ position: 'bottomleft' });

  randomControl.onAdd = function() {
    // 创建控件容器
    const container = L.DomUtil.create('div', 'leaflet-control-random leaflet-bar leaflet-control');

    // 创建随机传送按钮
    const button = L.DomUtil.create('a', 'leaflet-control-random-button', container);
    button.href = '#';
    button.title = '随机传送到巡礼点';
    button.innerHTML = '<i class="bi bi-shuffle"></i>';
    button.role = 'button';
    button.setAttribute('aria-label', '随机传送到巡礼点');

    // 添加点击事件
    L.DomEvent.on(button, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      teleportToRandomPoint();
    });

    return container;
  };

  // 添加到地图
  randomControl.addTo(map);
}

// 随机传送到巡礼点
function teleportToRandomPoint() {
  // 检查是否有巡礼点数据
  if (Object.keys(allAnimeData).length === 0) {
    showToast('暂无巡礼点数据，请稍后再试', 'warning');
    return;
  }

  // 收集所有有效的巡礼点
  const allPoints = [];

  // 遍历所有番剧
  for (const animeId in allAnimeData) {
    const anime = allAnimeData[animeId];

    // 确保番剧有巡礼点数据
    if (anime.points && Array.isArray(anime.points)) {
      // 遍历番剧的所有巡礼点
      anime.points.forEach(point => {
        // 确保巡礼点有地理坐标
        if (point.geo && Array.isArray(point.geo) && point.geo.length === 2) {
          allPoints.push({
            point: point,
            anime: anime,
            animeId: animeId
          });
        }
      });
    }
  }

  // 检查是否有有效的巡礼点
  if (allPoints.length === 0) {
    showToast('暂无有效的巡礼点数据', 'warning');
    return;
  }

  // 随机选择一个巡礼点
  const randomIndex = Math.floor(Math.random() * allPoints.length);
  const randomPointData = allPoints[randomIndex];

  // 获取巡礼点数据
  const { point, anime, animeId } = randomPointData;
  const [lat, lng] = point.geo;

  // 移动地图到随机巡礼点
  map.setView([lat, lng], 16);

  // 显示巡礼点信息
  showPointInfo(point, anime, animeId);

  // 显示提示
  showToast(`已传送到 ${anime.title} 的巡礼点: ${point.cn || point.name}`, 'success');
}

// 加载番剧数据
async function loadAnimeData() {
  try {
    // 显示右上角加载提示
    showTipLoader();

    // 首先加载番剧基本信息
    const indexResponse = await fetch(`https://${apiBaseUrl}/index.json`);
    if (!indexResponse.ok) {
      throw new Error(`HTTP error! status: ${indexResponse.status}`);
    }
    allAnimeData = await indexResponse.json();
    console.log('加载了', Object.keys(allAnimeData).length, '部番剧基本数据');

    // 不再预加载所有points.json，而是在需要时按需加载
    console.log('已启用懒加载模式，将在需要时加载番剧地点数据');

    // 隐藏右上角加载提示
    hideTipLoader();
  } catch (error) {
    console.error('加载番剧数据失败:', error);
    // 隐藏右上角加载提示
    hideTipLoader();
    throw error;
  }
}

// 更新图片URL以使用当前的API基础URL
function updateImageUrl(url) {
  if (!url) return url;

  // 如果是完整的URL（以http://或https://开头），则进行域名替换
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 如果URL包含默认域名，则替换为当前的API基础URL
    if (url.includes('image.xinu.ink')) {
      return url.replace('image.xinu.ink', apiBaseUrl);
    }
    // 如果URL已经包含了当前的API基础URL，则直接返回
    if (url.includes(apiBaseUrl)) {
      return url;
    }
    // 如果是其他完整URL，则直接返回
    return url;
  }

  // 如果是相对路径，则添加当前的API基础URL
  if (!url.startsWith('/')) {
    url = '/' + url;
  }
  return `https://${apiBaseUrl}${url}`;
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
      <img class="anime-cover" src="loading.svg" data-src="${updateImageUrl(anime.cover) || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
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
      <img class="point-cover" src="loading.svg" data-src="${updateImageUrl(point.image) || 'loading.svg'}" alt="${point.cn || point.name}">
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

// 加载可见的番剧封面图片 - 优化版本
function loadVisibleCoverImages() {
  try {
    // 获取所有带有data-src属性的封面图片
    const coverImages = document.querySelectorAll('.anime-cover[data-src], .point-cover[data-src]');

    // 如果没有需要加载的图片，直接返回
    if (coverImages.length === 0) return;

    // 获取可视区域尺寸
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    // 扩展可视区域范围，提前加载即将进入视野的图片
    const buffer = 100; // 像素缓冲区

    // 使用IntersectionObserver来检测可见性，如果支持
    if ('IntersectionObserver' in window) {
      // 创建一个新的观察器
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (src) {
              // 设置图片源
              img.src = src;
              img.removeAttribute('data-src');
              img.style.opacity = '1';
              // 停止观察该图片
              observer.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: `${buffer}px`
      });

      // 开始观察所有图片
      coverImages.forEach(img => observer.observe(img));
    } else {
      // 回退到传统方法
      coverImages.forEach(img => {
        const rect = img.getBoundingClientRect();
        const isVisible = (
          rect.top >= -buffer &&
          rect.left >= -buffer &&
          rect.bottom <= viewportHeight + buffer &&
          rect.right <= viewportWidth + buffer
        );

        if (isVisible) {
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.style.opacity = '1';
          }
        }
      });
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 添加所有标记点
async function addAllMarkers() {
  // 显示加载提示
  showTipLoader();

  try {
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
  } catch (error) {
    console.error('添加标记点失败:', error);
  } finally {
    // 隐藏加载提示
    hideTipLoader();
  }
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
  const visibleIds = new Set(); // 创建一个新的可视ID集合

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

    // 应用密度过滤算法
    let pointsToShow = anime.points;
    if (typeof window.applyDensityFilter === 'function') {
      pointsToShow = window.applyDensityFilter(anime.points, zoom);
    }

    // 添加可视区域内的标记点
    pointsToShow.forEach(point => {
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
    // 显示右上角加载提示
    showTipLoader();

    // 显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
    loadingIndicator.id = 'points-loading';
    document.body.appendChild(loadingIndicator);

    // 加载该番剧的points.json数据
    const pointsUrl = `https://${apiBaseUrl}/pic/data/${animeId}/points.json`;
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

      // 隐藏右上角加载提示
      hideTipLoader();

      return pointsData;
    } else {
      console.warn(`无法加载番剧 ${animeId} 的地点数据:`, pointsResponse.status);

      // 移除加载指示器
      const loadingElement = document.getElementById('points-loading');
      if (loadingElement) {
        loadingElement.remove();
      }

      // 隐藏右上角加载提示
      hideTipLoader();

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

    // 隐藏右上角加载提示
    hideTipLoader();

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
  const zoom = map.getZoom();

  // 应用密度过滤算法，但只在缩放级别较小时
  let pointsToShow = anime.points;
  if (typeof window.applyDensityFilter === 'function' && zoom < 15) {
    pointsToShow = window.applyDensityFilter(anime.points, zoom);
  }

  // 先添加过滤后的点
  pointsToShow.forEach(point => {
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

  // 决定是否显示为番剧封面图标记 - 减少随机数生成的开销
  const shouldShowAnimeCover = false; // 禁用随机封面，提高性能

  let marker;

  // 创建普通颜色标记 - 简化标记创建逻辑
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 12px; height: 12px; background-color: ${themeColor}; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  marker = L.marker([lat, lng], { icon });

  // 存储点信息，但不立即加载图片 - 只存储必要信息
  marker.pointData = {
    point: point,
    anime: anime,
    animeId: animeId
  };

  // 绑定点击事件
  marker.on('click', () => {
    // 先显示信息卡片，然后异步加载图片
    showPointInfo(point, anime, animeId);

    // 同时开始加载图片，设置为优先级
    loadPointImage(point, true).catch(() => {});
  });

  // 添加到地图和标记数组
  // 如果有聚合功能，使用聚合图层
  if (typeof window.addMarkerToCluster === 'function') {
    window.addMarkerToCluster(marker);
  } else {
    marker.addTo(map);
  }

  markers.push(marker);

  return marker;
}

// 清除所有标记点
function clearMarkers() {
  // 如果有聚合图层，先清空聚合图层
  if (typeof window.clearClusterGroup === 'function') {
    window.clearClusterGroup();
  }

  // 清除地图上的标记点
  markers.forEach(marker => {
    if (marker._map === map) {
      map.removeLayer(marker);
    }
  });

  markers = [];
  visibleMarkers.clear();
}

// 显示地点信息
// 初始化giscus评论系统
function initGiscus() {
  const giscusScript = document.createElement('script');
  giscusScript.src = 'https://giscus.app/client.js';
  giscusScript.setAttribute('data-repo', 'lmc26817/tourtalk');
  giscusScript.setAttribute('data-repo-id', 'R_kgDOOWDnbQ');
  giscusScript.setAttribute('data-category', 'Announcements');
  giscusScript.setAttribute('data-category-id', 'DIC_kwDOOWDnbc4Co5Rh');
  giscusScript.setAttribute('data-mapping', 'url');
  giscusScript.setAttribute('data-strict', '0');
  giscusScript.setAttribute('data-reactions-enabled', '1');
  giscusScript.setAttribute('data-emit-metadata', '0');
  giscusScript.setAttribute('data-input-position', 'top');
  giscusScript.setAttribute('data-theme', 'light_high_contrast');
  giscusScript.setAttribute('data-lang', 'zh-CN');
  giscusScript.setAttribute('data-loading', 'lazy');
  giscusScript.setAttribute('crossorigin', 'anonymous');
  giscusScript.setAttribute('async', '');

  // 移除旧的giscus容器内容
  const giscusContainer = document.querySelector('.giscus');
  giscusContainer.innerHTML = '';

  // 添加新的giscus脚本
  giscusContainer.appendChild(giscusScript);
}

function showPointInfo(point, anime, animeId) {
  console.log('显示信息卡片:', { point, anime, animeId });

  // 隐藏评论区并重置评论按钮状态
  commentsContainer.classList.add('d-none');
  toggleCommentsBtn.innerHTML = '<i class="bi bi-chat-dots"></i> 评论';
  toggleCommentsBtn.classList.remove('btn-primary');
  toggleCommentsBtn.classList.add('btn-outline-primary');

  // 更新URL参数，使用point.id和animeId作为标识
  const newUrl = `${window.location.pathname}?p=${point.id || ''}&fan=${animeId || ''}`;
  window.history.pushState({}, '', newUrl);

  // 初始化该巡礼点的评论区（现在使用URL作为标识）
  initGiscus();

  const pointName = document.getElementById('point-name');
  const animeName = document.getElementById('anime-name');
  const episodeInfo = document.getElementById('episode-info');
  const pointImage = document.getElementById('point-image');
  const googleMapsLink = document.getElementById('google-maps-link');
  const googleStreetviewLink = document.getElementById('google-streetview-link');
  const appleMapsLink = document.getElementById('apple-maps-link');
  const traceMoeLink = document.getElementById('trace-moe-link');

  // 检查DOM元素是否存在
  console.log('DOM元素:', {
    pointName: !!pointName,
    animeName: !!animeName,
    episodeInfo: !!episodeInfo,
    infoCard: !!infoCard
  });

  // 设置地点名称
  pointName.textContent = point.cn || point.name;
  console.log('设置地点名称:', pointName.textContent);

  // 设置番剧名称（可点击）
  const animeTitle = anime.name_cn || anime.name;
  animeName.innerHTML = `<a href="#" class="anime-link" data-id="${animeId}">${animeTitle}</a>`;
  console.log('设置番剧名称:', animeTitle);

  const animeLink = animeName.querySelector('.anime-link');
  animeLink.onclick = (e) => {
    e.preventDefault();
    selectAnime(animeId);
  };

  // 设置集数和时间信息
  if (point.ep) {
    let episodeText = `第${point.ep}集`;
    if (point.s !== undefined && point.s !== null) {
      const minutes = Math.floor(point.s / 60);
      const seconds = point.s % 60;
      episodeText += ` ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    episodeInfo.textContent = episodeText;
    console.log('设置集数和时间信息:', episodeText);
    traceMoeLink.classList.add('d-none');
  } else {
    episodeInfo.textContent = '';
    traceMoeLink.classList.remove('d-none');
    traceMoeLink.href = `https://trace.moe/?url=${encodeURIComponent(point.image)}`;
  }

  // 设置图片（首先使用加载中的占位图）
  pointImage.src = 'loading.svg';
  pointImage.alt = point.cn || point.name;

  // 检查图片是否已经在缓存中
  if (imageCache.has(point.image)) {
    // 如果已经缓存，直接使用
    pointImage.src = point.image;
    console.log('使用缓存图片:', point.image);
  } else {
    // 异步加载图片，但不阻塞卡片显示
    setTimeout(() => {
      loadPointImage(point, true).then(() => {
        if (pointImage && !pointImage.src.includes(point.image)) {
          pointImage.src = point.image;
          console.log('图片加载成功:', point.image);
        }
      }).catch(() => {
        // 加载失败时保持占位图
        console.warn(`无法加载图片: ${point.image}`);
      });
    }, 0); // 使用 setTimeout 确保异步执行
  }

  // 设置地图链接
  const [lat, lng] = point.geo;
  googleMapsLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  googleStreetviewLink.href = `http://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0`;
  appleMapsLink.href = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(point.cn || point.name)}&t=r`;

  // 添加对比图按钮链接
  const compareLink = document.getElementById('compare-link');
  compareLink.href = `vs.html?id=${animeId}&pointsid=${point.id}&pic=${encodeURIComponent(point.image)}`;
  compareLink.classList.remove('d-none');

  // 显示信息卡片
  infoCard.classList.remove('d-none');
  console.log('信息卡片显示完成');
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

  // 显示该番剧的所有巡礼点列表
  if (window.innerWidth >= 768) {
    // 桌面版使用桌面版的显示函数
    showAnimePointsList(anime, animeId);
  } else {
    // 移动版使用移动版的显示函数
    if (typeof showMobileAnimePoints === 'function') {
      showMobileAnimePoints(anime, animeId);
    }
  }
}

// 设置模式
async function setMode(mode) {
  // 如果模式没有变化，不进行操作
  if (currentMode === mode) {
    return;
  }

  // 显示加载提示
  showTipLoader();

  // 更新当前模式
  currentMode = mode;

  // 更新按钮状态
  updateModeButtons();

  // 使用setTimeout延迟执行标记点更新，避免界面卡顿
  setTimeout(async () => {
    try {
      // 清除现有标记点
      clearMarkers();

      // 如果是切换到所有模式，先只添加可视区域内的标记点
      if (mode === 'all') {
        await addVisibleAnimeMarkers();
      }
      // 如果是单番剧模式，添加当前番剧的标记点
      else if (mode === 'single' && currentAnime) {
        await addSingleAnimeMarkers(currentAnime);
      }
      // 如果是指南模式，添加指南的标记点
      else if (mode === 'guide' && currentGuide) {
        // TODO: 实现指南模式
      }

      // 更新可视区域内的标记点
      await updateVisibleMarkers();
    } catch (error) {
      console.error('更新标记点失败:', error);
    } finally {
      // 隐藏加载提示
      hideTipLoader();
    }
  }, 50);
}

// 初始化设置
function initSettings() {
  // 从localStorage加载API基础URL设置
  const savedApiBaseUrl = localStorage.getItem('apiBaseUrl');
  const apiSelect = document.getElementById('api-base-url-select');
  const customInput = document.getElementById('custom-api-input');
  const apiInput = document.getElementById('api-base-url');

  if (savedApiBaseUrl) {
    apiBaseUrl = savedApiBaseUrl;
    // 根据保存的URL设置选择框和输入框的值
    if (savedApiBaseUrl === 'www.302800.xyz') {
      apiSelect.value = 'mirror';
      customInput.classList.add('d-none');
    } else if (savedApiBaseUrl === 'image.xinu.ink') {
      apiSelect.value = 'xinu';
      customInput.classList.add('d-none');
    } else if (savedApiBaseUrl === 'cdnapi.pages.dev') {
      apiSelect.value = 'mcdn';
      customInput.classList.add('d-none');
    } else {
      apiSelect.value = 'custom';
      customInput.classList.remove('d-none');
      apiInput.value = savedApiBaseUrl;
    }
  }
}

// 绑定事件
function bindEvents() {
  // 侧边栏导航项点击事件
  sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');

      // 移除所有导航项的active类
      sidebarNavItems.forEach(navItem => navItem.classList.remove('active'));

      // 移除所有内容面板的active类
      contentPanels.forEach(panel => panel.classList.remove('active'));

      // 为当前点击的导航项添加active类
      item.classList.add('active');

      // 为对应的内容面板添加active类
      document.getElementById(targetPanel).classList.add('active');

      // 同步移动端导航栏状态
      mobileNavItems.forEach(navItem => {
        if (navItem.getAttribute('data-target') === targetPanel) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      });
    });
  });

  // 移动端导航项点击事件
  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');

      // 移除所有导航项的active类
      mobileNavItems.forEach(navItem => navItem.classList.remove('active'));

      // 移除所有内容面板的active类
      contentPanels.forEach(panel => panel.classList.remove('active'));

      // 为当前点击的导航项添加active类
      item.classList.add('active');

      // 为对应的内容面板添加active类
      document.getElementById(targetPanel).classList.add('active');

      // 同步侧边栏导航状态
      sidebarNavItems.forEach(navItem => {
        if (navItem.getAttribute('data-target') === targetPanel) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      });
    });
  });

  // 设置面板事件
  const apiBaseUrlSelect = document.getElementById('api-base-url-select');
  const apiBaseUrlInput = document.getElementById('api-base-url');
  const customApiInput = document.getElementById('custom-api-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn');

  // API选择框变更事件
  apiBaseUrlSelect.addEventListener('change', () => {
    const selectedValue = apiBaseUrlSelect.value;
    if (selectedValue === 'custom') {
      customApiInput.classList.remove('d-none');
    } else {
      customApiInput.classList.add('d-none');
      if (selectedValue === 'mirror') {
        apiBaseUrlInput.value = 'www.302800.xyz';
      } else if (selectedValue === 'xinu') {
        apiBaseUrlInput.value = 'image.xinu.ink';
      } else if (selectedValue === 'mcdn') {
        apiBaseUrlInput.value = 'cdnapi.pages.dev';
      }
    }
  });

  // 保存设置
  saveSettingsBtn.addEventListener('click', async () => {
    const selectedValue = apiBaseUrlSelect.value;
    let newBaseUrl;
    if (selectedValue === 'custom') {
      newBaseUrl = apiBaseUrlInput.value.trim();
    } else if (selectedValue === 'mirror') {
      newBaseUrl = 'www.302800.xyz';
    } else if (selectedValue === 'xinu') {
      newBaseUrl = 'image.xinu.ink';
    } else if (selectedValue === 'mcdn') {
      newBaseUrl = 'cdnapi.pages.dev';
    }
    if (newBaseUrl) {
      try {
        // 测试新的API地址是否可用
        const testResponse = await fetch(`https://${newBaseUrl}/index.json`);
        if (testResponse.ok) {
          apiBaseUrl = newBaseUrl;
          localStorage.setItem('apiBaseUrl', apiBaseUrl);
          // 重新加载数据
          showLoader();
          allAnimeData = {};
          markers.forEach(marker => map.removeLayer(marker));
          markers = [];
          await loadAnimeData();
          await addAllMarkers();
          renderAnimeList();
          hideLoader();
          alert('设置已保存，数据已更新');
        } else {
          alert('无法连接到新的API地址，请检查URL是否正确');
        }
      } catch (error) {
        console.error('API测试失败:', error);
        alert('无法连接到新的API地址，请检查URL是否正确');
      }
    }
  });

  // 重置设置
  resetSettingsBtn.addEventListener('click', async () => {
    const defaultBaseUrl = 'www.302800.xyz';
    apiBaseUrlInput.value = defaultBaseUrl;
    if (apiBaseUrl !== defaultBaseUrl) {
      apiBaseUrl = defaultBaseUrl;
      localStorage.setItem('apiBaseUrl', apiBaseUrl);
      // 重新加载数据
      showLoader();
      allAnimeData = {};
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];
      await loadAnimeData();
      await addAllMarkers();
      renderAnimeList();
      hideLoader();
      alert('设置已重置为默认值，数据已更新');
    }
  });

  // 搜索功能
  searchButton.addEventListener('click', () => {
    const searchText = searchInput.value.trim();
    renderAnimeList(searchText, true); // 重置列表并搜索
  });

  // 评论按钮点击事件 - 增强版带动画效果
  toggleCommentsBtn.addEventListener('click', () => {
    const isHidden = commentsContainer.classList.contains('d-none');

    // 切换显示状态
    commentsContainer.classList.toggle('d-none');

    // 更新按钮文本和图标
    if (isHidden) {
      toggleCommentsBtn.innerHTML = '<i class="bi bi-chat-dots-fill"></i> 关闭评论';
      toggleCommentsBtn.classList.remove('btn-outline-primary');
      toggleCommentsBtn.classList.add('btn-primary');

      // 清空评论容器
      commentsContainer.innerHTML = '<div class="giscus"></div>';

      // 重新初始化giscus
      if (typeof window.initGiscus === 'function') {
        window.initGiscus();
      }

      // 在移动端上，确保评论区域可见
      if (window.innerWidth <= 768) {
        // 滚动到评论区域
        setTimeout(() => {
          commentsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300); // 等待过渡动画开始
      }
    } else {
      toggleCommentsBtn.innerHTML = '<i class="bi bi-chat-dots"></i> 评论';
      toggleCommentsBtn.classList.remove('btn-primary');
      toggleCommentsBtn.classList.add('btn-outline-primary');
    }
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

  // 番剧列表滚动事件 - 用于加载更多番剧和懒加载封面图片 - 使用防抖函数优化
  const animeListContainer = document.querySelector('.anime-list-container');
  let scrollDebounceTimer = null;

  animeListContainer.addEventListener('scroll', () => {
    // 使用requestAnimationFrame来优化滚动事件处理
    if (!scrollDebounceTimer) {
      scrollDebounceTimer = requestAnimationFrame(() => {
        try {
          // 加载可见的封面图片
          loadVisibleCoverImages();

          // 检查是否滚动到底部，如果是则加载更多番剧
          const scrollTop = animeListContainer.scrollTop;
          const scrollHeight = animeListContainer.scrollHeight;
          const clientHeight = animeListContainer.clientHeight;

          // 当滚动到距离底部200px时，加载更多，提前预加载内容
          if (scrollHeight - scrollTop - clientHeight < 200 && !isLoading && hasMoreAnimes) {
            // 滚动到底部，尝试加载更多内容
            if (currentFilter) {
              // 搜索模式：加载更多搜索结果
              renderAnimeList(currentFilter, false); // 不重置列表，继续加载更多
            } else if (animeExpandActivated) {
              // 番剧展开模式：加载更多番剧
              renderAnimeList('', false); // 不重置列表，继续加载更多
            } else if (document.getElementById('load-more-point')) {
              // 巡礼地点模式：加载更多地点
              renderAnimeList('', false); // 不重置列表，继续加载更多
            }
            // 其他情况不加载更多内容
          }
        } catch (error) {
          // 静默处理错误，不影响用户体验
        } finally {
          // 重置防抖定时器
          scrollDebounceTimer = null;
        }
      });
    }
  });

}

// 显示加载动画
function showLoader() {
  // 显示全屏加载动画
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = '<div class="loader-spinner"></div>';
  loader.id = 'loader';
  document.body.appendChild(loader);

  // 显示右上角加载提示
  const loadingTip = document.getElementById('loading-indicator');
  if (loadingTip) {
    loadingTip.classList.remove('d-none');
  }
}

// 隐藏加载动画
function hideLoader() {
  // 隐藏全屏加载动画
  const loader = document.getElementById('loader');
  if (loader) {
    loader.remove();
  }

  // 隐藏右上角加载提示
  const loadingTip = document.getElementById('loading-indicator');
  if (loadingTip) {
    loadingTip.classList.add('d-none');
  }
}

// 只显示右上角加载提示，不显示全屏加载动画
function showTipLoader() {
  const loadingTip = document.getElementById('loading-indicator');
  if (loadingTip) {
    loadingTip.classList.remove('d-none');
  }
}

// 隐藏右上角加载提示
function hideTipLoader() {
  const loadingTip = document.getElementById('loading-indicator');
  if (loadingTip) {
    loadingTip.classList.add('d-none');
  }
}

// 加载点的图片 - 优化版本
async function loadPointImage(point, isPriority = false) {
  // 如果没有图片URL，直接返回
  if (!point?.image) return null;

  try {
    // 如果图片已经在缓存中，更新LRU队列并直接返回
    if (imageCache.has(point.image)) {
      // 更新LRU队列 - 使用效率更高的方式
      const index = imageCacheQueue.indexOf(point.image);
      if (index > -1) {
        imageCacheQueue.splice(index, 1);
        imageCacheQueue.push(point.image);
      }
      return imageCache.get(point.image);
    }

    // 检查是否已在加载队列中
    if (imageLoadQueue.includes(point.image)) {
      // 如果是优先级请求，将其提升到队列前面
      if (isPriority) {
        const index = imageLoadQueue.indexOf(point.image);
        if (index > -1) {
          imageLoadQueue.splice(index, 1);
          imageLoadQueue.unshift(point.image);
        }
      }

      // 等待加载完成 - 使用更高效的方式
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (imageCache.has(point.image)) {
            clearInterval(checkInterval);
            resolve(imageCache.get(point.image));
          }
        }, 100);
      });
    }

    // 添加到加载队列
    if (isPriority) {
      imageLoadQueue.unshift(point.image);
    } else {
      imageLoadQueue.push(point.image);
    }

    // 加载图片并缓存
    return await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // 检查缓存是否已满
        if (imageCacheQueue.length >= MAX_CACHE_SIZE) {
          // 移除最久未使用的图片
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
        // 从加载队列中移除
        const loadIndex = imageLoadQueue.indexOf(point.image);
        if (loadIndex > -1) {
          imageLoadQueue.splice(loadIndex, 1);
        }
        reject(new Error(`无法加载图片`));
      };

      img.src = updateImageUrl(point.image);
    });
  } catch (error) {
    // 从加载队列中移除
    const loadIndex = imageLoadQueue.indexOf(point.image);
    if (loadIndex > -1) {
      imageLoadQueue.splice(loadIndex, 1);
    }
    return null;
  }
}

// 更新可视区域内的标记点 - 优化版本
// 将函数暴露到全局作用域，以便其他模块可以调用
window.updateVisibleMarkers = updateVisibleMarkers;
async function updateVisibleMarkers() {
  // 如果地图正在移动，不更新标记点
  if (isMapMoving) return;

  // 显示加载提示
  showTipLoader();

  try {
    // 获取当前地图可视区域
    const bounds = map.getBounds();
    const visibleIds = new Set();
    const zoom = map.getZoom();

    // 根据当前模式决定要显示的标记点
    if (currentMode === 'all') {
      // 只有在缩放级别足够大时才加载和显示标记点
      if (zoom >= 10) { // 可以根据需要调整这个阈值
        // 计算可视区域内的番剧 - 使用更高效的方法
        const visibleAnimes = new Set();

        // 使用对象条目遍历而不是对象转换为数组
        for (const animeId in allAnimeData) {
          const anime = allAnimeData[animeId];
          // 如果已经加载了points数据，检查是否有点在可视区域内
          if (anime.points?.length) {
            // 使用some方法快速找到第一个匹配的点
            if (anime.points.some(point =>
              point.geo?.length === 2 && bounds.contains([point.geo[0], point.geo[1]])
            )) {
              visibleAnimes.add(animeId);
            }
          }
        }

        // 并行加载所有可视番剧的数据 - 使用Promise.all而不是allSettled来加快处理
        if (visibleAnimes.size > 0) {
          const loadPromises = [];
          for (const animeId of visibleAnimes) {
            const anime = allAnimeData[animeId];
            if (!anime.points?.length) {
              loadPromises.push(loadAnimePoints(animeId).catch(() => {})); // 静默处理错误
            }
          }

          // 等待所有加载完成
          if (loadPromises.length > 0) {
            await Promise.all(loadPromises);
          }

          // 对于可视区域内的每个番剧，添加标记点
          for (const animeId of visibleAnimes) {
            const anime = allAnimeData[animeId];

            // 如果加载失败或没有地点，跳过
            if (!anime.points?.length) continue;

            // 应用密度过滤算法
            let pointsToShow = anime.points;
            if (typeof window.applyDensityFilter === 'function') {
              // 确保密度过滤在所有缩放级别下都能正确应用
              try {
                pointsToShow = window.applyDensityFilter(anime.points, zoom);
              } catch (error) {
                console.error(`应用密度过滤时出错：`, error);
                pointsToShow = anime.points; // 出错时保留原始点
              }
            }

            // 添加可视区域内的标记点 - 使用批量处理
            for (const point of pointsToShow) {
              if (!point.geo?.length === 2) continue;

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
            }
          }
        }
      }
    } else if (currentMode === 'single' && currentAnime) {
      // 只显示当前选中番剧的点
      const anime = allAnimeData[currentAnime];

      // 确保已加载该番剧的地点数据
      if (!anime.points?.length) {
        try {
          await loadAnimePoints(currentAnime);
        } catch (error) {
          // 静默处理加载错误
        }
      }

      if (anime?.points?.length) {
        // 在单番剧模式下，也应用密度过滤
        let pointsToShow = anime.points;
        if (typeof window.applyDensityFilter === 'function') {
          // 在单番剧模式下也应用密度过滤，确保过滤强度设置生效
          try {
            pointsToShow = window.applyDensityFilter(anime.points, zoom);
          } catch (error) {
            console.error(`单番剧模式下应用密度过滤时出错：`, error);
            pointsToShow = anime.points; // 出错时保留原始点
          }
        }

        // 使用批量处理而不是单个遍历
        for (const point of pointsToShow) {
          if (!point.geo?.length === 2) continue;

          // 单番剧模式下，所有点都显示，不考虑是否在可视区域内
          const markerId = `${currentAnime}-${point.geo[0]}-${point.geo[1]}`;
          visibleIds.add(markerId);

          if (!visibleMarkers.has(markerId)) {
            const marker = addMarker(point, anime, currentAnime);
            visibleMarkers.set(markerId, marker);
          }
        }
      }
    }

    // 移除不在可视区域内的标记点 - 使用更高效的方法
    const markersToRemove = [];

    // 使用迭代器而不是forEach来提高性能
    for (const [markerId, marker] of visibleMarkers.entries()) {
      if (!visibleIds.has(markerId)) {
        markersToRemove.push({ marker, markerId });
      }
    }

    // 批量移除标记点，减少DOM操作
    if (markersToRemove.length > 0) {
      for (const { marker, markerId } of markersToRemove) {
        map.removeLayer(marker);
        visibleMarkers.delete(markerId);

        // 从markers数组中也移除 - 使用更高效的方法
        const index = markers.indexOf(marker);
        if (index > -1) {
          markers.splice(index, 1);
        }
      }
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
  } finally {
    // 隐藏加载提示
    hideTipLoader();
  }
}

// 防抖函数，避免地图移动时频繁更新标记点 - 进一步优化版本
function debounceUpdateMarkers() {
  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // 显示加载提示
  showTipLoader();

  // 获取当前缩放级别
  const currentZoom = map.getZoom();

  // 根据缩放级别动态调整防抖延迟
  // 缩放级别越小，延迟越长，减少更新频率
  const dynamicDelay = currentZoom < 10 ? 800 : (currentZoom < 14 ? 600 : 400);

  // 设置动态延迟时间
  debounceTimer = setTimeout(async () => {
    try {
      // 检查地图是否仍在移动
      if (!isMapMoving) {
        // 当缩放级别过小时，不更新标记点，提高性能
        if (currentZoom < 6) {
          hideTipLoader();
          return;
        }

        // 异步更新可见标记点
        await updateVisibleMarkers();

        // 仅在缩放级别足够大时加载图片
        if (currentZoom >= 12) {
          // 使用requestIdleCallback或setTimeout在浏览器空闲时加载图片
          if (window.requestIdleCallback) {
            window.requestIdleCallback(() => prioritizeVisibleImages(), { timeout: 2000 });
          } else {
            setTimeout(() => prioritizeVisibleImages(), 200);
          }
        }
      } else {
        // 如果地图仍在移动，隐藏加载提示
        hideTipLoader();
      }
    } catch (error) {
      // 静默处理错误，不影响用户体验
      hideTipLoader();
    }
  }, dynamicDelay); // 使用动态延迟时间
}

// 图片生命周期管理
function startImageLifecycleManagement() {
  // 每60秒检查一次，清理不在视口内的图片
  imageCleanupTimer = setInterval(() => {
    cleanupUnusedImages();
  }, 60000);
}

// 清理未使用的图片
function cleanupUnusedImages() {
  // 如果缓存未达到阈值，不进行清理
  if (imageCacheQueue.length < MAX_CACHE_SIZE * 0.8) {
    return;
  }

  try {
    // 获取当前可视区域
    const visibleImageUrls = new Set();

    // 收集当前视口内所有标记点的图片URL - 使用批量处理
    for (const [_, marker] of visibleMarkers) {
      if (marker.pointData?.point?.image) {
        visibleImageUrls.add(marker.pointData.point.image);
      }
    }

    // 收集当前显示在信息卡片中的图片
    const infoCardImage = document.getElementById('point-image');
    if (infoCardImage?.src && !infoCardImage.src.includes('placeholder')) {
      visibleImageUrls.add(infoCardImage.src);
    }

    // 保留视口内的图片和最近使用的图片（保留最近使用的30%）
    const recentlyUsedCount = Math.floor(MAX_CACHE_SIZE * 0.3);
    const recentlyUsed = new Set(imageCacheQueue.slice(-recentlyUsedCount));

    // 使用过滤器一次性处理，减少循环次数
    imageCacheQueue = imageCacheQueue.filter(imageUrl => {
      if (visibleImageUrls.has(imageUrl) || recentlyUsed.has(imageUrl)) {
        return true;
      } else {
        // 从缓存中移除
        imageCache.delete(imageUrl);
        return false;
      }
    });
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 优先加载视口内的图片
function prioritizeVisibleImages() {
  try {
    // 获取当前可视区域内的所有标记点 - 使用数组映射减少循环
    const visiblePoints = Array.from(visibleMarkers.values())
      .filter(marker => marker.pointData?.point)
      .map(marker => marker.pointData.point);

    // 如果没有可见的点，直接返回
    if (visiblePoints.length === 0) return;

    // 对视口内的点进行预加载，但限制同时加载的数量
    const MAX_CONCURRENT_LOADS = 3; // 减少并发加载数量
    let loadingCount = 0;

    // 先加载视口中心附近的点
    const mapCenter = map.getCenter();

    // 使用更高效的排序方法
    const pointsWithDistance = visiblePoints
      .filter(point => point.image && point.geo && point.geo.length === 2)
      .map(point => {
        const dist = L.latLng(point.geo[0], point.geo[1]).distanceTo(mapCenter);
        return { point, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5); // 只处理前5个最近的点

    // 预加载最近的点的图片
    for (const { point } of pointsWithDistance) {
      if (!imageCache.has(point.image) && !imageLoadQueue.includes(point.image) && loadingCount < MAX_CONCURRENT_LOADS) {
        loadingCount++;
        loadPointImage(point).finally(() => {
          loadingCount--;
        });
      }
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 记录内存使用情况
function logMemoryUsage() {
  // 内存使用情况记录已禁用，以减少控制台输出
  return; // 确保不执行任何操作
}

// 添加全局错误处理
window.addEventListener('error', function(event) {
  // 静默处理错误，不影响用户体验
  // 仅在严重错误时记录到控制台
  if (event.error && event.error.message && event.error.message.includes('fatal')) {
    console.error('Fatal error:', event.error.message);
  }
  // 隐藏加载提示，确保用户界面不会卡住
  hideTipLoader();
  hideLoader();
  return false; // 阻止错误向上传播
});

// 添加Promise错误处理
window.addEventListener('unhandledrejection', function(event) {
  // 静默处理Promise错误，不影响用户体验
  // 仅在严重错误时记录到控制台
  if (event.reason && typeof event.reason.message === 'string' && event.reason.message.includes('fatal')) {
    console.error('Fatal promise rejection:', event.reason.message);
  }
  // 隐藏加载提示，确保用户界面不会卡住
  hideTipLoader();
  hideLoader();
  return false; // 阻止错误向上传播
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();

    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const pointId = urlParams.get('p');
    const animeId = urlParams.get('fan');

    // 如果存在巡礼点ID和番剧ID参数，显示对应的巡礼点信息
    if (pointId && animeId && allAnimeData[animeId]) {
      const anime = allAnimeData[animeId];
      const point = anime.points?.find(p => p.id === pointId);
      if (point) {
        // 设置地图视图并显示巡礼点信息
        if (point.geo && point.geo.length === 2) {
          map.setView([point.geo[0], point.geo[1]], 16);
          showPointInfo(point, anime, animeId);
        }
      }
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
    console.error('Error during initialization:', error);
    hideLoader();
  }
});

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
    <img class="anime-cover" src="loading.svg" data-src="${updateImageUrl(anime.cover) || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
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

  // 添加数据属性，用于滑动菜单识别巡礼点数据
  item.dataset.id = point.id;
  item.dataset.pointId = point.id;
  item.dataset.animeId = animeId;

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

  // 获取坐标数据
  let lat, lng;
  if (point.geo && Array.isArray(point.geo) && point.geo.length === 2) {
    // 如果有geo数组，使用它
    [lat, lng] = point.geo;
  } else if (typeof point.lat === 'number' && typeof point.lng === 'number') {
    // 如果有lat和lng属性，使用它们
    lat = point.lat;
    lng = point.lng;
  } else {
    // 没有有效坐标，无法添加
    console.error('巡礼点没有有效坐标，无法添加到指南');
    return false;
  }

  // 创建要添加到指南的点对象
  const guidePoint = {
    id: point.id,
    name: point.name || point.cn || '未命名地点',
    lat: parseFloat(lat),  // 确保是数值
    lng: parseFloat(lng),  // 确保是数值
    image: point.image,
    animeId: animeId,
    animeName: anime.title || anime.name || anime.name_cn || '未知番剧',
    episode: point.episode || '',
    order: guide.points.length + 1
  };

  // 再次检查坐标是否有效
  if (isNaN(guidePoint.lat) || isNaN(guidePoint.lng)) {
    console.error('坐标转换后不是有效数值，无法添加到指南');
    return false;
  }

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

  // 绑定在地图上查看按钮事件
  document.getElementById('view-guide-on-map-btn').onclick = () => {
    // 关闭模态框
    bootstrap.Modal.getInstance(modal).hide();
    // 切换到指南模式并显示指南标记点
    setMode('guide');
    showGuideMarkers(guide.id);
  };

  // 绑定KML导出按钮事件
  document.getElementById('export-kml-btn').onclick = () => {
    if (guide.points.length === 0) {
      showToast('指南中没有巡礼点，无法导出', 'warning');
      return;
    }
    downloadKML(guide);
    showToast(`已导出KML文件：${guide.name}_guide.kml`, 'success');
  };

  // 绑定在Google地图中查看按钮事件
  document.getElementById('open-in-google-maps-btn').onclick = () => {
    if (guide.points.length === 0) {
      showToast('指南中没有巡礼点，无法在Google地图中查看', 'warning');
      return;
    }
    openKMLInGoogleMaps(guide);
  };

  // 绑定在Google Earth中查看按钮事件
  document.getElementById('open-in-google-earth-btn').onclick = () => {
    if (guide.points.length === 0) {
      showToast('指南中没有巡礼点，无法在Google Earth中查看', 'warning');
      return;
    }
    openKMLInGoogleEarth(guide);
  };

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
  const pointParam = urlParams.get('p');
  const animeParam = urlParams.get('fan');

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

  // 如果URL中包含巡礼点和番剧参数，尝试加载对应的信息
  if (pointParam && animeParam) {
    console.log('从URL加载巡礼点:', pointParam, '番剧:', animeParam);

    // 先选择对应的番剧
    selectAnime(animeParam);

    // 然后尝试找到并显示对应的巡礼点
    setTimeout(() => {
      const anime = allAnimeData[animeParam];
      if (anime && anime.points) {
        const point = anime.points.find(p => p.id === pointParam);
        if (point) {
          // 找到了对应的巡礼点，显示信息
          showPointInfo(point, anime, animeParam);
          // 如果有地理坐标，将地图定位到该点
          if (point.geo && point.geo.length === 2) {
            map.setView([point.geo[0], point.geo[1]], 16);
          }
        }
      }
    }, 500); // 给selectAnime一些时间加载番剧数据
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
    const anime = allAnimeData[point.animeId];
    if (anime) {
      showPointInfo({
        id: point.id,
        name: point.name,
        lat: point.lat,
        lng: point.lng,
        image: point.image,
        episode: point.episode
      }, anime, point.animeId);
    } else {
      // 如果没有找到番剧数据，仍然显示基本信息
      const pointInfo = {
        id: point.id,
        name: point.name,
        geo: [point.lat, point.lng],
        image: point.image,
        episode: point.episode
      };
      const animeInfo = {
        title: point.animeName,
        theme_color: guide.color
      };
      showPointInfo(pointInfo, animeInfo, point.animeId);
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
  // 只在桌面版显示L2D容器，移动端不显示
  if (window.innerWidth > 768) {
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
}

// 加载L2D模型
function loadL2DModel() {
  try {
    // 替换为实际的模型URL
    const modelUrl = 'https://fastly.jsdelivr.net/gh/guansss/pixi-live2d-display/examples/assets/shizuku/shizuku.model.json';
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

  // 如果是移动端，直接显示提示信息
  if (window.innerWidth <= 768) {
    showToast(`已为"${guide.name}"生成行程规划，包含${guide.points.length}个地点。`, 'success');
    return;
  }

  // 展开L2D站娘（仅桌面版）
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

// 在信息卡中显示巡礼点信息 - 优化版本
function showPointInfo(point, anime, animeId) {
  try {
    // 更新URL参数
    const newUrl = `${window.location.pathname}?p=${point.id}&fan=${animeId}`;
    window.history.pushState({}, '', newUrl);

    // 初始化该巡礼点的独立评论区
    if (typeof initGiscus === 'function') {
      initGiscus(point.id);
    }

    // 获取DOM元素
    const infoCard = document.getElementById('info-card');
    const pointImage = document.getElementById('point-image');
    const pointName = document.getElementById('point-name');
    const animeName = document.getElementById('anime-name');
    const episodeInfo = document.getElementById('episode-info');
    const googleMapsLink = document.getElementById('google-maps-link');
    const googleStreetviewLink = document.getElementById('google-streetview-link');
    const appleMapsLink = document.getElementById('apple-maps-link');
    const traceMoeLink = document.getElementById('trace-moe-link');
    const compareLink = document.getElementById('compare-link');
    const addToGuideBtn = document.getElementById('add-to-guide-btn');

    // 设置信息卡内容
    if (pointName) pointName.textContent = point.name || '';

    // 创建番剧名称的超链接
    if (animeName) {
      animeName.innerHTML = `<a href="#" class="anime-link" data-id="${animeId}">${anime.name_cn || anime.name || ''}</a>`;

      // 为番剧名称添加点击事件
      const animeLink = animeName.querySelector('.anime-link');
      if (animeLink) {
        animeLink.addEventListener('click', (e) => {
          e.preventDefault();
          // 切换到单番剧模式
          currentMode = 'single';
          currentAnime = animeId;
          // 更新模式按钮状态
          updateModeButtons();
          // 更新标记点显示
          updateVisibleMarkers();
          // 显示巡礼点列表
          showAnimePointsList(anime, animeId);
        });
      }
    }

    // 设置集数信息
    if (episodeInfo) episodeInfo.textContent = point.ep ? `第${point.ep}集` : '';

    // 设置地图链接
    let lat, lng;
    if (point.geo && Array.isArray(point.geo) && point.geo.length === 2) {
      [lat, lng] = point.geo;
      // 确保坐标有效
      if (typeof lat === 'number' && typeof lng === 'number') {
        if (googleMapsLink) googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        if (googleStreetviewLink) googleStreetviewLink.href = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        if (appleMapsLink) appleMapsLink.href = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(point.cn || point.name || '')}`;

        // 显示地图链接
        if (googleMapsLink) googleMapsLink.style.display = 'inline-block';
        if (googleStreetviewLink) googleStreetviewLink.style.display = 'inline-block';
        if (appleMapsLink) appleMapsLink.style.display = 'inline-block';
      } else {
        // 坐标无效，隐藏地图链接
        if (googleMapsLink) googleMapsLink.style.display = 'none';
        if (googleStreetviewLink) googleStreetviewLink.style.display = 'none';
        if (appleMapsLink) appleMapsLink.style.display = 'none';
      }
    } else {
      // 无坐标数据，隐藏地图链接
      if (googleMapsLink) googleMapsLink.style.display = 'none';
      if (googleStreetviewLink) googleStreetviewLink.style.display = 'none';
      if (appleMapsLink) appleMapsLink.style.display = 'none';
    }

    // 先显示占位图
    if (pointImage) {
      pointImage.src = 'loading.svg';
      pointImage.alt = point.name || '';
    }
    if (traceMoeLink) traceMoeLink.classList.add('d-none');
    if (compareLink) compareLink.classList.add('d-none');

    // 显示信息卡
    if (infoCard) infoCard.classList.remove('d-none');

    // 异步加载图片
    if (point.image && pointImage) {
      const img = new Image();
      img.onload = () => {
        const processedImageUrl = updateImageUrl(point.image);
        pointImage.src = processedImageUrl;

        if (traceMoeLink) {
          traceMoeLink.href = `https://trace.moe/?url=${encodeURIComponent(processedImageUrl)}`;
          traceMoeLink.classList.remove('d-none');
        }

        if (compareLink) {
          compareLink.href = `vs.html?id=${animeId}&pointsid=${point.id}&pic=${encodeURIComponent(processedImageUrl)}`;
          compareLink.classList.remove('d-none');
        }

        // 添加点击查看大图功能
        pointImage.onclick = () => {
          const imageViewerModal = document.getElementById('image-viewer-modal');
          if (imageViewerModal) {
            const fullsizeImage = document.getElementById('fullsize-image');
            if (fullsizeImage) fullsizeImage.src = point.image;
            const modal = new bootstrap.Modal(imageViewerModal);
            modal.show();
          }
        };
      };
      img.onerror = () => {
        pointImage.src = 'placeholder.jpg';
        pointImage.alt = '图片加载失败';
        pointImage.onclick = null; // 移除点击事件
      };
      img.src = updateImageUrl(point.image);
    } else if (pointImage) {
      pointImage.src = 'placeholder.jpg';
      pointImage.alt = '无图片';
      pointImage.onclick = null; // 移除点击事件
    }

    // 设置添加到指南按钮事件
    if (addToGuideBtn) {
      addToGuideBtn.onclick = () => {
        openAddToGuideModal(point, anime, animeId);
      };
    }

    // 绑定关闭按钮事件
    const closeBtn = document.getElementById('close-info');
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (infoCard) infoCard.classList.add('d-none');
        // 恢复原始URL
        window.history.pushState({}, '', window.location.pathname);
      };
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 显示番剧的巡礼点列表
function showAnimePointsList(anime, animeId) {
  const animeList = document.getElementById('anime-list');

  // 创建一个临时容器，用于动画过渡
  const tempContainer = document.createElement('div');
  tempContainer.className = 'points-list-entering';

  // 清空列表
  animeList.innerHTML = '';

  // 创建返回按钮
  const backButton = document.createElement('button');
  backButton.className = 'btn btn-outline-primary btn-sm mb-3 back-button animated';
  backButton.innerHTML = '<i class="bi bi-arrow-left"></i> 返回番剧列表';
  backButton.onclick = () => {
    // 添加退出动画
    const currentContent = document.querySelector('#anime-list > div');
    if (currentContent) {
      currentContent.classList.add('anime-list-exiting');

      // 等待动画完成后再切换回番剧列表
      setTimeout(() => {
        // 切换回全部模式
        currentMode = 'all';
        currentAnime = null;

        // 使用setMode函数更新模式和地图显示
        setMode('all');

        // 更新模式按钮状态
        updateModeButtons();

        // 重新渲染番剧列表
        renderAnimeList();
      }, 300); // 与动画时间保持一致
    } else {
      // 如果没有当前内容，直接返回
      currentMode = 'all';
      currentAnime = null;
      setMode('all');
      updateModeButtons();
      renderAnimeList();
    }
  };
  tempContainer.appendChild(backButton);

  // 创建番剧封面头部区域
  const coverHeader = document.createElement('div');
  coverHeader.className = 'anime-cover-header anime-title-header animated';

  // 创建背景图层
  const coverBg = document.createElement('div');
  coverBg.className = 'anime-cover-bg';
  coverBg.style.backgroundImage = `url('${updateImageUrl(anime.cover)}')`;
  coverHeader.appendChild(coverBg);

  // 创建毛玻璃效果层
  const coverGlass = document.createElement('div');
  coverGlass.className = 'anime-cover-glass';
  coverHeader.appendChild(coverGlass);

  // 创建渐变层
  const coverGradient = document.createElement('div');
  coverGradient.className = 'anime-cover-gradient';
  coverHeader.appendChild(coverGradient);

  // 创建封面图
  const coverImage = document.createElement('img');
  coverImage.className = 'anime-cover-image';
  coverImage.src = updateImageUrl(anime.cover);
  coverImage.alt = anime.name_cn || anime.name;
  coverHeader.appendChild(coverImage);

  // 创建番剧名称
  const coverName = document.createElement('h4');
  coverName.className = 'anime-cover-name';
  coverName.textContent = anime.name_cn || anime.name;
  coverHeader.appendChild(coverName);

  // 创建巡礼点数量
  const pointsCount = anime.points && Array.isArray(anime.points) ? anime.points.length : 0;
  const coverCount = document.createElement('p');
  coverCount.className = 'anime-cover-count';
  coverCount.textContent = `${pointsCount} 个巡礼地点`;
  coverHeader.appendChild(coverCount);

  tempContainer.appendChild(coverHeader);

  // 创建巡礼点列表
  if (anime.points && Array.isArray(anime.points)) {
    const pointsList = document.createElement('div');
    pointsList.className = 'points-list';

    anime.points.forEach((point, index) => {
      const pointItem = document.createElement('div');
      pointItem.className = 'point-item d-flex align-items-center p-2 border-bottom animated';

      // 添加缩略图
      const thumbnail = document.createElement('img');
      thumbnail.className = 'point-thumbnail me-2';
      thumbnail.src = updateImageUrl(point.image) || 'placeholder.jpg';
      thumbnail.alt = point.name;
      thumbnail.style.width = '50px';
      thumbnail.style.height = '50px';
      thumbnail.style.objectFit = 'cover';

      // 添加地点信息
      const info = document.createElement('div');
      info.className = 'point-info flex-grow-1';
      info.innerHTML = `
        <div class="point-name">${point.name}</div>
        ${point.ep ? `<small class="text-muted">第${point.ep}集</small>` : ''}
      `;

      pointItem.appendChild(thumbnail);
      pointItem.appendChild(info);

      // 添加点击事件
      pointItem.style.cursor = 'pointer';
      pointItem.onclick = () => {
        if (point.geo && point.geo.length === 2) {
          map.setView([point.geo[0], point.geo[1]], 16);
          showPointInfo(point, anime, animeId);
        }
      };

      pointsList.appendChild(pointItem);
    });

    tempContainer.appendChild(pointsList);
  } else {
    const noPoints = document.createElement('p');
    noPoints.className = 'text-muted';
    noPoints.textContent = '暂无巡礼地点数据';
    tempContainer.appendChild(noPoints);
  }

  // 将临时容器添加到列表中
  animeList.appendChild(tempContainer);
}

// 初始化设置
function initSettings() {
  // 从localStorage加载API基础URL设置
  const savedApiBaseUrl = localStorage.getItem('apiBaseUrl');
  const apiSelect = document.getElementById('api-base-url-select');
  const customInput = document.getElementById('custom-api-input');
  const apiInput = document.getElementById('api-base-url');

  if (savedApiBaseUrl) {
    apiBaseUrl = savedApiBaseUrl;
    // 根据保存的URL设置选择框和输入框的值
    if (savedApiBaseUrl === 'www.302800.xyz') {
      apiSelect.value = 'mirror';
      customInput.classList.add('d-none');
    } else if (savedApiBaseUrl === 'image.xinu.ink') {
      apiSelect.value = 'xinu';
      customInput.classList.add('d-none');
    } else if (savedApiBaseUrl === 'cdnapi.pages.dev') {
      apiSelect.value = 'mcdn';
      customInput.classList.add('d-none');
    } else {
      apiSelect.value = 'custom';
      customInput.classList.remove('d-none');
      apiInput.value = savedApiBaseUrl;
    }
  }
}

// 绑定事件
function bindEvents() {
  // 侧边栏导航项点击事件
  sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');

      // 移除所有导航项的active类
      sidebarNavItems.forEach(navItem => navItem.classList.remove('active'));

      // 移除所有内容面板的active类
      contentPanels.forEach(panel => panel.classList.remove('active'));

      // 为当前点击的导航项添加active类
      item.classList.add('active');

      // 为对应的内容面板添加active类
      document.getElementById(targetPanel).classList.add('active');

      // 同步移动端导航栏状态
      mobileNavItems.forEach(navItem => {
        if (navItem.getAttribute('data-target') === targetPanel) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      });
    });
  });

  // 移动端导航项点击事件
  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');

      // 移除所有导航项的active类
      mobileNavItems.forEach(navItem => navItem.classList.remove('active'));

      // 移除所有内容面板的active类
      contentPanels.forEach(panel => panel.classList.remove('active'));

      // 为当前点击的导航项添加active类
      item.classList.add('active');

      // 为对应的内容面板添加active类
      document.getElementById(targetPanel).classList.add('active');

      // 同步侧边栏导航状态
      sidebarNavItems.forEach(navItem => {
        if (navItem.getAttribute('data-target') === targetPanel) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      });
    });
  });

  // 设置面板事件
  const apiBaseUrlSelect = document.getElementById('api-base-url-select');
  const apiBaseUrlInput = document.getElementById('api-base-url');
  const customApiInput = document.getElementById('custom-api-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn');

  // API选择框变更事件
  apiBaseUrlSelect.addEventListener('change', () => {
    const selectedValue = apiBaseUrlSelect.value;
    if (selectedValue === 'custom') {
      customApiInput.classList.remove('d-none');
    } else {
      customApiInput.classList.add('d-none');
      if (selectedValue === 'mirror') {
        apiBaseUrlInput.value = 'www.302800.xyz';
      } else if (selectedValue === 'xinu') {
        apiBaseUrlInput.value = 'image.xinu.ink';
      } else if (selectedValue === 'mcdn') {
        apiBaseUrlInput.value = 'cdnapi.pages.dev';
      }
    }
  });

  // 保存设置
  saveSettingsBtn.addEventListener('click', async () => {
    const selectedValue = apiBaseUrlSelect.value;
    let newBaseUrl;
    if (selectedValue === 'custom') {
      newBaseUrl = apiBaseUrlInput.value.trim();
    } else if (selectedValue === 'mirror') {
      newBaseUrl = 'www.302800.xyz';
    } else if (selectedValue === 'xinu') {
      newBaseUrl = 'image.xinu.ink';
    } else if (selectedValue === 'mcdn') {
      newBaseUrl = 'cdnapi.pages.dev';
    }
    if (newBaseUrl) {
      try {
        // 测试新的API地址是否可用
        const testResponse = await fetch(`https://${newBaseUrl}/index.json`);
        if (testResponse.ok) {
          apiBaseUrl = newBaseUrl;
          localStorage.setItem('apiBaseUrl', apiBaseUrl);
          // 重新加载数据
          showLoader();
          allAnimeData = {};
          markers.forEach(marker => map.removeLayer(marker));
          markers = [];
          await loadAnimeData();
          await addAllMarkers();
          renderAnimeList();
          hideLoader();
          alert('设置已保存，数据已更新');
        } else {
          alert('无法连接到新的API地址，请检查URL是否正确');
        }
      } catch (error) {
        console.error('API测试失败:', error);
        alert('无法连接到新的API地址，请检查URL是否正确');
      }
    }
  });

  // 重置设置
  resetSettingsBtn.addEventListener('click', async () => {
    const defaultBaseUrl = 'www.302800.xyz';
    apiBaseUrlInput.value = defaultBaseUrl;
    if (apiBaseUrl !== defaultBaseUrl) {
      apiBaseUrl = defaultBaseUrl;
      localStorage.setItem('apiBaseUrl', apiBaseUrl);
      // 重新加载数据
      showLoader();
      allAnimeData = {};
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];
      await loadAnimeData();
      await addAllMarkers();
      renderAnimeList();
      hideLoader();
      alert('设置已重置为默认值，数据已更新');
    }
  });

  // 搜索功能
  searchButton.addEventListener('click', () => {
    const searchText = searchInput.value.trim();
    renderAnimeList(searchText, true); // 重置列表并搜索
  });

  // 评论按钮点击事件
  toggleCommentsBtn.addEventListener('click', () => {
    const isHidden = commentsContainer.classList.contains('d-none');
    commentsContainer.classList.toggle('d-none');

    // 如果评论区从隐藏变为显示，重新初始化giscus
    if (isHidden) {
      // 清空评论容器
      commentsContainer.innerHTML = '<div class="giscus"></div>';
      // 重新初始化giscus
      if (typeof window.initGiscus === 'function') {
        window.initGiscus();
      }
    }
  });

  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const searchText = searchInput.value.trim();
      renderAnimeList(searchText, true); // 重置列表并搜索
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

  // 更新模式按钮状态 - 桌面版
  document.getElementById('mode-all').classList.toggle('active', mode === 'all');
  document.getElementById('mode-all').classList.toggle('btn-primary', mode === 'all');
  document.getElementById('mode-all').classList.toggle('btn-outline-primary', mode !== 'all');

  document.getElementById('mode-single').classList.toggle('active', mode === 'single');
  document.getElementById('mode-single').classList.toggle('btn-primary', mode === 'single');
  document.getElementById('mode-single').classList.toggle('btn-outline-primary', mode !== 'single');

  document.getElementById('mode-guide').classList.toggle('active', mode === 'guide');
  document.getElementById('mode-guide').classList.toggle('btn-primary', mode === 'guide');
  document.getElementById('mode-guide').classList.toggle('btn-outline-primary', mode !== 'guide');

  // 更新移动版底部导航栏的状态
  // 注意：移动版底部导航栏的激活状态与模式不完全对应
  // 我们只在切换到指南模式时激活指南按钮
  if (mode === 'guide') {
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-target') === 'guide-panel');
    });
  }

  // 清除所有标记点
  clearMarkers();

  // 刷新地图视图以避免视觉残留
  if (map) {
    map.invalidateSize();
  }

  // 根据模式显示相应的标记点
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

  // 再次刷新地图视图以确保所有标记点正确显示
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
      updateVisibleMarkers(); // 更新可见标记点
    }, 100);
  }

  // 更新移动端模式切换按钮状态
  if (typeof updateMobileModeBtns === 'function') {
    updateMobileModeBtns(mode);
  }
}

// API连通测试功能
// 预定义的API节点列表
const apiNodes = [
  { name: 'Mirror接口', url: 'www.302800.xyz', value: 'mirror' },
  { name: 'XINU接口', url: 'image.xinu.ink', value: 'xinu' },
  { name: 'MCDN接口', url: 'cdnapi.pages.dev', value: 'mcdn' }
];

// 初始化API测试功能
function initApiTest() {
  const testApiBtn = document.getElementById('test-api-btn');
  const retestApiBtn = document.getElementById('retest-api-btn');
  const apiTestModal = new bootstrap.Modal(document.getElementById('api-test-modal'));

  // 点击测试按钮时打开模态框并开始测试
  testApiBtn.addEventListener('click', () => {
    apiTestModal.show();
    startApiTest();
  });

  // 重新测试按钮
  retestApiBtn.addEventListener('click', startApiTest);
}

// 开始 API 测试
async function startApiTest() {
  // 重置测试状态
  const progressBar = document.getElementById('api-test-progress');
  const resultsTable = document.getElementById('api-test-results');
  const testingBadge = document.querySelector('#api-test-modal .badge.bg-info');
  const completeBadge = document.querySelector('#api-test-modal .badge.bg-success');

  progressBar.style.width = '0%';
  resultsTable.innerHTML = '';
  testingBadge.classList.remove('d-none');
  completeBadge.classList.add('d-none');

  // 获取自定义API地址（如果有）
  const apiBaseUrlSelect = document.getElementById('api-base-url-select');
  const apiBaseUrlInput = document.getElementById('api-base-url');
  const customApiEnabled = apiBaseUrlSelect.value === 'custom';
  const customApiUrl = customApiEnabled ? apiBaseUrlInput.value.trim() : null;

  // 创建要测试的节点列表
  let nodesToTest = [...apiNodes];
  if (customApiEnabled && customApiUrl) {
    nodesToTest.push({ name: '自定义接口', url: customApiUrl, value: 'custom' });
  }

  // 初始化结果表格
  nodesToTest.forEach(node => {
    const row = document.createElement('tr');
    row.id = `api-test-row-${node.value}`;
    row.innerHTML = `
      <td>${node.name}</td>
      <td><span class="badge bg-secondary">等待测试</span></td>
      <td>-</td>
      <td><button class="btn btn-sm btn-outline-primary select-api-btn" data-api-value="${node.value}" disabled>选择</button></td>
    `;
    resultsTable.appendChild(row);
  });

  // 测试每个节点
  const progressStep = 100 / nodesToTest.length;

  // 并行测试所有节点
  const testPromises = nodesToTest.map(node => testApiNode(node, progressStep));

  // 等待所有测试完成
  await Promise.all(testPromises);

  // 测试完成
  progressBar.style.width = '100%';
  testingBadge.classList.add('d-none');
  completeBadge.classList.remove('d-none');

  // 按响应时间排序结果
  sortApiTestResults();
}

// 测试单个 API 节点
async function testApiNode(node, progressStep) {
  const row = document.getElementById(`api-test-row-${node.value}`);
  const statusCell = row.querySelector('td:nth-child(2)');
  const timeCell = row.querySelector('td:nth-child(3)');
  const selectBtn = row.querySelector('.select-api-btn');
  const progressBar = document.getElementById('api-test-progress');

  // 更新状态为测试中
  statusCell.innerHTML = '<span class="badge bg-info">测试中</span>';

  // 使用图片加载方式测试连通性（类似 ping）
  return new Promise(resolve => {
    const startTime = performance.now();
    const img = new Image();
    let isResolved = false;

    // 设置超时
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        statusCell.innerHTML = '<span class="badge bg-danger">超时</span>';
        timeCell.textContent = '-';
        updateProgress();
        resolve();
      }
    }, 30000); // 30秒超时

    // 图片加载成功
    img.onload = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        statusCell.innerHTML = '<span class="badge bg-success">可用</span>';
        timeCell.textContent = `${responseTime} ms`;
        selectBtn.disabled = false;

        // 添加选择按钮事件
        selectBtn.addEventListener('click', () => {
          const apiBaseUrlSelect = document.getElementById('api-base-url-select');
          const apiBaseUrlInput = document.getElementById('api-base-url');

          // 设置选择框的值
          apiBaseUrlSelect.value = node.value;

          // 如果是自定义接口，显示输入框并设置值
          if (node.value === 'custom') {
            document.getElementById('custom-api-input').classList.remove('d-none');
            apiBaseUrlInput.value = node.url;
          } else {
            document.getElementById('custom-api-input').classList.add('d-none');
          }

          // 关闭模态框
          bootstrap.Modal.getInstance(document.getElementById('api-test-modal')).hide();

          // 显示成功提示
          showToast(`已选择 ${node.name}`, 'success');
        });

        updateProgress();
        resolve();
      }
    };

    // 图片加载失败
    img.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        statusCell.innerHTML = '<span class="badge bg-danger">不可用</span>';
        timeCell.textContent = '-';
        updateProgress();
        resolve();
      }
    };

    // 尝试加载一个小图片来测试连通性
    // 使用时间戳避免缓存
    // 使用确认存在的图片路径
    img.src = `https://${node.url}/pic/data/639/images/n26oa9hs2-1723200025877.jpg?t=${Date.now()}`;

    // 更新进度条
    function updateProgress() {
      const currentWidth = parseFloat(progressBar.style.width) || 0;
      progressBar.style.width = `${currentWidth + progressStep}%`;
    }
  });
}

// 按响应时间排序测试结果
function sortApiTestResults() {
  const resultsTable = document.getElementById('api-test-results');
  const rows = Array.from(resultsTable.querySelectorAll('tr'));

  // 按响应时间排序（只考虑可用的节点）
  rows.sort((a, b) => {
    const aStatus = a.querySelector('td:nth-child(2) .badge').classList.contains('bg-success');
    const bStatus = b.querySelector('td:nth-child(2) .badge').classList.contains('bg-success');

    // 先按状态排序（可用的在前）
    if (aStatus && !bStatus) return -1;
    if (!aStatus && bStatus) return 1;

    // 如果状态相同，再按响应时间排序
    if (aStatus && bStatus) {
      const aTime = parseInt(a.querySelector('td:nth-child(3)').textContent) || Infinity;
      const bTime = parseInt(b.querySelector('td:nth-child(3)').textContent) || Infinity;
      return aTime - bTime;
    }

    return 0;
  });

  // 重新添加排序后的行
  rows.forEach(row => resultsTable.appendChild(row));
}

// 初始化API测试功能
document.addEventListener('DOMContentLoaded', () => {
  initApiTest();
});
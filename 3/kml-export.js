/**
 * KML导出功能
 * 用于将指南数据导出为KML格式，以便在Google地图/地球等应用中使用
 */

// 将指南数据转换为KML格式
function generateKML(guide) {
  // 确保所有点的坐标都是有效的数值
  const validPoints = guide.points.filter(point => {
    // 检查坐标是否存在且为数值
    return point && 
           typeof point.lat === 'number' && !isNaN(point.lat) && 
           typeof point.lng === 'number' && !isNaN(point.lng);
  });

  if (validPoints.length === 0) {
    console.error('没有有效的坐标点');
    return null;
  }

  // KML文件头部
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(guide.name)}</name>
    <description>${escapeXml(guide.description || '')}</description>
    <Style id="guidePointStyle">
      <IconStyle>
        <color>ff${guide.color.substring(1)}</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="lineStyle">
      <LineStyle>
        <color>ff${guide.color.substring(1)}</color>
        <width>4</width>
      </LineStyle>
    </Style>`;

  // 添加每个巡礼点
  validPoints.forEach((point, index) => {
    kml += `
    <Placemark>
      <name>${escapeXml(point.name)} (${index + 1})</name>
      <description>
        <![CDATA[
          <div style="max-width: 300px;">
            <h3>${escapeXml(point.name)}</h3>
            <p><strong>番剧:</strong> ${escapeXml(point.animeName)}</p>
            ${point.episode ? `<p><strong>集数:</strong> ${escapeXml(point.episode)}</p>` : ''}
            ${point.image ? `<img src="${escapeXml(point.image)}" style="max-width: 100%; height: auto;" />` : ''}
          </div>
        ]]>
      </description>
      <styleUrl>#guidePointStyle</styleUrl>
      <Point>
        <coordinates>${point.lng},${point.lat},0</coordinates>
      </Point>
    </Placemark>`;
  });

  // 如果有多个点，添加路线
  if (validPoints.length > 1) {
    kml += `
    <Placemark>
      <name>${escapeXml(guide.name)} 路线</name>
      <description>指南路线</description>
      <styleUrl>#lineStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>`;
    
    validPoints.forEach(point => {
      kml += `${point.lng},${point.lat},0 `;
    });
    
    kml += `</coordinates>
      </LineString>
    </Placemark>`;
  }

  // KML文件尾部
  kml += `
  </Document>
</kml>`;

  return kml;
}

// 下载KML文件
function downloadKML(guide) {
  const kml = generateKML(guide);
  if (!kml) {
    console.error('生成KML失败');
    return;
  }
  
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${guide.name.replace(/[^\w\s]/gi, '')}_guide.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 在Google地图中打开KML
function openKMLInGoogleMaps(guide) {
  // 确保至少有一个有效点
  if (!guide.points || guide.points.length === 0) {
    console.error('指南中没有巡礼点');
    return;
  }
  
  // 找到第一个有效点
  const firstValidPoint = guide.points.find(point => 
    point && typeof point.lat === 'number' && !isNaN(point.lat) && 
    typeof point.lng === 'number' && !isNaN(point.lng)
  );
  
  if (!firstValidPoint) {
    console.error('没有有效的坐标点');
    return;
  }
  
  // 生成KML内容
  const kml = generateKML(guide);
  if (!kml) return;
  
  // 使用Base64编码KML内容
  const encodedKml = btoa(unescape(encodeURIComponent(kml)));
  
  // 构建Google地图URL
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${firstValidPoint.lat},${firstValidPoint.lng}`;
  
  // 打开新窗口
  window.open(googleMapsUrl, '_blank');
  
  // 由于Google Maps API限制，无法直接通过URL加载KML
  console.log('由于Google Maps API限制，无法直接通过URL加载KML。请下载KML文件后手动导入Google地图。');
}

// 在Google Earth Web中打开KML
function openKMLInGoogleEarth(guide) {
  // 确保至少有一个有效点
  if (!guide.points || guide.points.length === 0) {
    console.error('指南中没有巡礼点');
    return;
  }
  
  // 找到第一个有效点
  const firstValidPoint = guide.points.find(point => 
    point && typeof point.lat === 'number' && !isNaN(point.lat) && 
    typeof point.lng === 'number' && !isNaN(point.lng)
  );
  
  if (!firstValidPoint) {
    console.error('没有有效的坐标点');
    return;
  }
  
  // 构建Google Earth URL - 直接定位到第一个点
  const googleEarthUrl = `https://earth.google.com/web/@${firstValidPoint.lat},${firstValidPoint.lng},0a,10000d,35y,0h,0t,0r`;
  
  // 打开新窗口
  window.open(googleEarthUrl, '_blank');
  
  // 由于Google Earth Web API限制，无法直接通过URL加载KML
  console.log('由于Google Earth Web API限制，无法直接通过URL加载KML。请下载KML文件后手动导入Google Earth。');
}

// 辅助函数：转义XML特殊字符
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

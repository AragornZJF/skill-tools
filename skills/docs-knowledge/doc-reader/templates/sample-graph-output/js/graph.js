    const themes = {"dark-tech":{"name":"暗色科技","background":"#0a0e27","cardBg":"#111638","toolbarBg":"#111638","textPrimary":"#e0e0ff","textSecondary":"#8888aa","borderColor":"#1e2250","buttonBg":"#1a1f4e","buttonHoverBg":"#2a2f6e","buttonActiveBg":"#3a3f8e","tooltipBg":"rgba(17,22,56,0.95)","colors":["#00d4ff","#7b2ff7","#ff6b6b","#ffd93d","#00ff88","#ff8c42","#b388ff","#64ffda"],"lineColor":"rgba(100,180,255,0.35)","lineHighlight":"rgba(0,212,255,0.85)"},"nature-fresh":{"name":"自然清新","background":"#f0f7ee","cardBg":"#ffffff","toolbarBg":"#ffffff","textPrimary":"#1b4332","textSecondary":"#52796f","borderColor":"#d8f3dc","buttonBg":"#d8f3dc","buttonHoverBg":"#b7e4c7","buttonActiveBg":"#95d5b2","tooltipBg":"rgba(255,255,255,0.95)","colors":["#2d6a4f","#e07a5f","#3d405b","#81b29a","#f2cc8f","#264653","#e76f51","#6d6875"],"lineColor":"rgba(45,106,79,0.3)","lineHighlight":"rgba(45,106,79,0.75)"},"warm-sunset":{"name":"暖阳落日","background":"#1a1420","cardBg":"#2a1f30","toolbarBg":"#2a1f30","textPrimary":"#fde8d0","textSecondary":"#c9a87c","borderColor":"#3d2a4a","buttonBg":"#3d2a4a","buttonHoverBg":"#5a3d6a","buttonActiveBg":"#f59e0b","tooltipBg":"rgba(42,31,48,0.95)","colors":["#fbbf24","#f97316","#ef4444","#a855f7","#ec4899","#fcd34d","#fb923c","#8b5cf6"],"lineColor":"rgba(251,191,36,0.25)","lineHighlight":"rgba(251,191,36,0.7)"},"ocean-deep":{"name":"深海幽蓝","background":"#0b1a33","cardBg":"#0f2244","toolbarBg":"#0f2244","textPrimary":"#caf0f8","textSecondary":"#90e0ef","borderColor":"#023e8a","buttonBg":"#023e8a","buttonHoverBg":"#0077b6","buttonActiveBg":"#0096c7","tooltipBg":"rgba(15,34,68,0.95)","colors":["#48cae4","#ff6b6b","#ffd93d","#00ff88","#b388ff","#f77f00","#e0aaff","#00d4ff"],"lineColor":"rgba(72,202,228,0.3)","lineHighlight":"rgba(72,202,228,0.75)"}};
    const layouts = {"force":{"name":"力导向","icon":"fa-project-diagram","echarts":{"layout":"force","force":{"repulsion":300,"gravity":0.1,"edgeLength":[80,200],"friction":0.6},"roam":true,"draggable":true}},"radial":{"name":"辐射状","icon":"fa-bullseye","echarts":{"layout":"circular","circular":{"rotateLabel":true},"roam":true,"draggable":true}}};
    const graphData = {"nodes":[{"id":"1","name":"超级马里奥掘金者","category":"核心方法论","weight":100},{"id":"2","name":"淘金模式","category":"核心方法论","weight":85},{"id":"3","name":"GPS 知识图谱全景导航","category":"核心方法论","weight":85},{"id":"4","name":"通读全文","category":"淘金四阶段","weight":75},{"id":"5","name":"提炼金块","category":"淘金四阶段","weight":78},{"id":"6","name":"意料之外","category":"淘金四阶段","weight":70},{"id":"7","name":"延伸与疑惑","category":"淘金四阶段","weight":65},{"id":"8","name":"金币","category":"隐喻元素","weight":50},{"id":"9","name":"蘑菇","category":"隐喻元素","weight":50},{"id":"10","name":"星星","category":"隐喻元素","weight":45},{"id":"11","name":"问号","category":"隐喻元素","weight":45},{"id":"12","name":"knowledge-graph-map","category":"GPS实现","weight":80},{"id":"13","name":"力导向布局","category":"GPS实现","weight":40},{"id":"14","name":"辐射状布局","category":"GPS实现","weight":40},{"id":"15","name":"4 套主题","category":"GPS实现","weight":40},{"id":"16","name":"自测理解","category":"核心方法论","weight":60}],"links":[{"source":"1","target":"2","relation":"包含"},{"source":"1","target":"3","relation":"包含"},{"source":"2","target":"4","relation":"第一阶段"},{"source":"2","target":"5","relation":"第二阶段"},{"source":"2","target":"6","relation":"第三阶段"},{"source":"2","target":"7","relation":"第四阶段"},{"source":"4","target":"8","relation":"隐喻"},{"source":"5","target":"9","relation":"隐喻"},{"source":"6","target":"10","relation":"隐喻"},{"source":"7","target":"11","relation":"隐喻"},{"source":"3","target":"12","relation":"渲染"},{"source":"12","target":"13","relation":"支持"},{"source":"12","target":"14","relation":"支持"},{"source":"12","target":"15","relation":"支持"},{"source":"3","target":"16","relation":"用途"}],"categories":["核心方法论","淘金四阶段","隐喻元素","GPS实现"]};

    let currentTheme = 'dark-tech';
    let currentLayout = 'force';
    let chart = null;

    function applyCSS(theme) {
      const t = themes[theme];
      document.body.style.background = t.background;
      document.body.style.color = t.textPrimary;
      document.body.style.setProperty('--border', t.borderColor);
      const toolbar = document.getElementById('toolbar');
      toolbar.style.background = t.toolbarBg;
      toolbar.style.borderColor = t.borderColor;
      const footer = document.getElementById('footer');
      footer.style.background = t.toolbarBg;
      footer.style.borderColor = t.borderColor;
      footer.style.color = t.textSecondary;
      document.documentElement.style.setProperty('--toolbar-fade', t.toolbarBg);
      document.querySelectorAll('.btn').forEach(btn => {
        btn.style.background = t.buttonBg;
        btn.style.color = t.textPrimary;
        btn.style.borderColor = t.borderColor;
      });
      document.querySelectorAll('.btn.active').forEach(btn => {
        btn.style.background = t.buttonActiveBg;
      });
      document.querySelectorAll('.ctrl-select').forEach(sel => {
        sel.style.background = t.buttonBg;
        sel.style.color = t.textPrimary;
        sel.style.borderColor = t.borderColor;
      });
    }

    function buildOption(layoutName) {
      const t = themes[currentTheme];
      const layoutCfg = layouts[layoutName].echarts;

      const categoryMap = {};
      graphData.categories.forEach((cat, i) => {
        categoryMap[cat] = i;
      });

      const seriesData = graphData.nodes.map(n => {
        const catIdx = categoryMap[n.category] !== undefined ? categoryMap[n.category] : 0;
        const catColor = t.colors[catIdx % t.colors.length];
        let nodeSize, fontSize, fontWeight, borderWidth, shadowBlur;
        if (n.weight >= 70) {
          nodeSize = Math.max(50, n.weight * 1.0 + 10);
          fontSize = 15;
          fontWeight = 'bold';
          borderWidth = 3;
          shadowBlur = 15;
        } else if (n.weight >= 50) {
          nodeSize = Math.max(38, n.weight * 0.7 + 10);
          fontSize = 13;
          fontWeight = 'bold';
          borderWidth = 2.5;
          shadowBlur = 8;
        } else {
          nodeSize = Math.max(28, n.weight * 0.6 + 10);
          fontSize = 11;
          fontWeight = 'normal';
          borderWidth = 2;
          shadowBlur = 3;
        }
        return {
          id: n.id,
          name: n.name,
          value: n.weight,
          category: catIdx,
          symbolSize: nodeSize,
          label: {
            show: true,
            fontSize: fontSize,
            fontWeight: fontWeight,
            color: t.textPrimary
          },
          itemStyle: {
            color: catColor,
            borderColor: n.weight >= 50 ? catColor : t.borderColor,
            borderWidth: borderWidth,
            shadowBlur: shadowBlur,
            shadowColor: catColor
          },
          tooltip: {
            formatter: function(params) {
              const d = params.data;
              const cat = graphData.categories[d.category] || '';
              const linkCount = graphData.links.filter(l => String(l.source) === d.id || String(l.target) === d.id).length;
              return '<b>' + d.name + '</b><br/>分类: ' + cat + '<br/>权重: ' + d.value + '<br/>关联数: ' + linkCount;
            }
          }
        };
      });

      const seriesLinks = graphData.links.map(l => ({
        source: String(l.source),
        target: String(l.target),
        lineStyle: {
          color: t.lineColor,
          width: 1,
          curveness: 0.15
        }
      }));

      return {
        tooltip: {
          trigger: 'item',
          backgroundColor: t.tooltipBg,
          borderColor: t.borderColor,
          borderWidth: 1,
          padding: [8, 12],
          textStyle: { color: t.textPrimary, fontSize: 13 },
          extraCssText: 'border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.3);',
          formatter: function(params) {
            if (params.dataType === 'node') {
              const d = params.data;
              const cat = graphData.categories[d.category] || '';
              const catColor = t.colors[d.category % t.colors.length];
              const linkCount = graphData.links.filter(l => String(l.source) === d.id || String(l.target) === d.id).length;
              return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + catColor + ';margin-right:6px;"></span><b>' + d.name + '</b><br/><span style="color:' + catColor + ';">' + cat + '</span><br/>权重: ' + d.value + '&nbsp;&nbsp;关联: ' + linkCount;
            }
            if (params.dataType === 'edge') {
              const rel = graphData.links.find(l => String(l.source) === params.data.source && String(l.target) === params.data.target);
              return (rel ? rel.relation : '');
            }
            return '';
          }
        },
        legend: {
          data: graphData.categories.map((cat, i) => ({ name: cat, itemStyle: { color: t.colors[i % t.colors.length] } })),
          type: 'scroll',
          orient: 'vertical',
          textStyle: { color: t.textSecondary, fontSize: 11 },
          top: 60,
          right: 10,
          selectedMode: true,
          pageTextStyle: { color: t.textSecondary },
          pageIconColor: t.textSecondary,
          pageIconInactiveColor: t.borderColor
        },
        animationDuration: 800,
        animationEasingUpdate: 'quinticInOut',
        series: [{
          type: 'graph',
          ...layoutCfg,
          data: seriesData,
          links: seriesLinks,
          categories: graphData.categories.map((cat, i) => ({ name: cat })),
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 3, color: t.lineHighlight },
            itemStyle: { borderWidth: 4, shadowBlur: 20 }
          },
          label: { show: true, position: 'right' },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [4, 10],
          lineStyle: { opacity: 0.6, curveness: 0.1 }
        }]
      };
    }

    function initChart() {
      var dom = document.getElementById('chart');
      if (!dom || dom.offsetWidth === 0 || dom.offsetHeight === 0) return false;
      chart = echarts.init(dom);
      updateChart();
      window.addEventListener('resize', function() { if (chart) chart.resize(); });
      return true;
    }

    function updateChart() {
      if (!chart) return;
      var option = buildOption(currentLayout);
      chart.setOption(option, true);
    }

    function switchLayout(name) {
      currentLayout = name;
      document.getElementById('btnForce').classList.toggle('active', name === 'force');
      document.getElementById('btnRadial').classList.toggle('active', name === 'radial');
      updateChart();
    }

    function switchTheme(name) {
      currentTheme = name;
      applyCSS(name);
      updateChart();
    }

    // Init
    document.addEventListener('DOMContentLoaded', function() {
      applyCSS(currentTheme);
      document.getElementById('themeSelect').value = currentTheme;
      if (!initChart()) {
        setTimeout(function() { initChart(); switchLayout(currentLayout); }, 100);
      } else {
        switchLayout(currentLayout);
      }
    });

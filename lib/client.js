/**
 * @typedef CSSCache
 * @property {string} k key 值
 * @property {string} n 名称
 * @property {string} s 代码
 */

/**
 * 服务端下发的 CSS 配置
 *
 * @param {Object} options
 * @param {CSSCache[]} options.csses
 * @param {number} options.cookieLimit cookie 最大长度限制，默认 4000
 */
window.inlineCSSCache = function (options) {
  var csses = options.csses;
  var cookieLimit = options.cookieLimit || 4000;
  var doc = document;
  var head = document.head;
  var hasRestoreFailed = false; // 是否存在缓存恢复失败的情况

  /**
   * css 缓存的 cookie 名称，存储已经缓存了的样式 key 值，以逗号隔开
   *
   * key1,key2
   */

  var cssCookieName = 'csses';
  /**
   * css 缓存样式的标识存储 key 值，key 是缓存样式的 key 值，value 是缓存样式的标志名称
   * 
   * { [stringg key]: name }
   */

  var cssNameCache = 'csses';
  /**
   * css 缓存样式的源码存储 key 值前缀
   */

  var cssCachePrefix = 'css.';
  /**
   * 由于存储空间不足被清除的样式缓存，key 值是缓存样式的 key 值，value 是缓存样式对象 CSSCache
   * 
   * { [stringg key]: CSSCache }
   */

  var cssDeletedCache = {};
  var cssCookie = getCookieItem(cssCookieName);
  var cssCookieArray = cssCookie.split(',');
  var cssNames;

  try {
    cssNames = JSON.parse(localStorage.getItem(cssNameCache));

    if (!cssNames) {
      cssNames = {};
    }
  } catch (error) {
    cssNames = {};
  }

  var deleteCSSNameCache = function deleteCSSNameCache(key) {
    if (cssNames[key]) {
      cssNames[key] = undefined;
      delete cssNames[key];
    }
  };
  /**
   * 添加缓存 cookie，先删除旧的，再往缓存头里插入新的 key 值
   * @param {CSSCache} css
   * @param {boolean} isDelete
   */


  var changeCookie = function changeCookie(css, isDelete) {
    var cssKey = css.k;
    var cssName = css.n;
    var deletedKeys = [cssKey];
    Object.keys(cssNames).forEach(function (key) {
      if (cssName === cssNames[key]) {
        deletedKeys.push(key);
        deleteCSSNameCache(key);
      }
    });

    for (var i = cssCookieArray.length - 1; i >= 0; i--) {
      var key = cssCookieArray[i];

      if (deletedKeys.indexOf(key) >= 0) {
        cssCookieArray.splice(i, 1);

        if (key !== cssKey || isDelete === true) {
          localStorage.removeItem(cssCachePrefix + key);
        }

        break;
      }
    }

    if (isDelete !== true) {
      cssNames[cssKey] = cssName;
      cssCookieArray.unshift(cssKey);
    }
  };
  /**
   * 缓存空间不够了，需要清除部分记录（目前清除一般的 cookie 值）
   */


  var clearCache = function clearCache() {
    var half = Math.floor(cssCookieArray.length / 2);
    var deleted = cssCookieArray.splice(half, cssCookieArray.length - half);

    for (var index = 0; index < deleted.length; index++) {
      var cssKey = deleted[index];
      var cssCacheKey = cssCachePrefix + cssKey;
      cssDeletedCache[cssKey] = localStorage.getItem(cssCacheKey);
      deleteCSSNameCache(cssKey);
      localStorage.removeItem(cssCacheKey);
    }
  };
  /**
   * 添加缓存
   * @param {CSSCache} css
   */


  var addCache = function addCache(css, clear) {
    var cssKey = css.k;

    if (cssKey && css.s) {
      var cssCacheKey = cssCachePrefix + cssKey;

      try {
        localStorage.setItem(cssCacheKey, JSON.stringify(css));
        changeCookie(css);
      } catch (error) {
        console.error(error);

        if (clear !== false) {
          // 只重试一次
          clearCache();
          addCache(css, false);
        }
      }
    }
  };
  /**
   * 获取缓存
   * @param {CSSCache} css
   */


  var getCache = function getCache(css) {
    var cssKey = css.k;
    var cssCacheKey = cssCachePrefix + cssKey;
    var cssSource = '';

    try {
      if (cssDeletedCache[cssKey]) {
        // 判断对应的缓存是否因为空间不足删掉了
        cssSource = cssDeletedCache[cssKey];
        css.s = cssSource;
        addCache(css); // 重新加回去
      } else {
        cssSource = JSON.parse(localStorage.getItem(cssCacheKey)).s;
        changeCookie(css);
      }
    } catch (error) {
      console.error(error);
      changeCookie(css, true); // 删除

      hasRestoreFailed = true;
    }

    return cssSource;
  }; // css 更新


  for (var i = 0; i < csses.length; i++) {
    var css = csses[i];
    var cssSource = css.s;

    if (cssSource) {
      addCache(css);
    } else {
      cssSource = getCache(css);
    }

    var style = doc.createElement('style');
    style.innerHTML = cssSource;
    head.appendChild(style);
  }

  try {
    var cssCookieValue = cssCookieArray.filter(function (key) {
      return !!key;
    }).reduce(function (rcc, key) {
      if (rcc.length > cookieLimit || (rcc + key).length > cookieLimit) {
        localStorage.removeItem(cssCachePrefix + key);
        deleteCSSNameCache(key);
        return rcc;
      }

      if (rcc) {
        rcc += ',';
      }

      return rcc + key;
    }, '');

    try {
      localStorage.setItem(cssNameCache, JSON.stringify(cssNames));
    } catch (error) {
      localStorage.clear();
      cssCookieValue = '';
    }

    var cssCookieExpired = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    doc.cookie = cssCookieName + '=' + cssCookieValue + ';' + cssCookieExpired + ';path=/';
  } catch (error) {
    console.error(error);
  }

  if (hasRestoreFailed) {
    document.location.reload();
  }

  function getCookieItem(sKey) {
    return document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + sKey.replace(/[-.+*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1') || '';
  }
};
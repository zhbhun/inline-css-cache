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
window.inlineCSSCache = function(options) {
  var csses = options.csses;
  var cookieLimit = options.cookieLimit || 4000;
  var doc = document;
  var head = document.head;
  var hasRestoreFailed = false; // 是否存在缓存恢复失败的情况

  /**
   * Cookie 维护
   *
   * key1,key2
   */
  var cssCookieKey = 'csses';
  var cssCachePrefix = 'css.';
  var cssDeletedCache = {};
  var cssCookie = getCookieItem(cssCookieKey);
  var cssCookieArray = cssCookie.split(',');
  /**
   * 添加缓存 cookie，先删除旧的，再往缓存头里插入新的 key 值
   */
  var changeCookie = function(key, isDelete) {
    var matchedIndex;
    for (var index = 0; index < cssCookieArray.length; index++) {
      if (key === cssCookieArray[index]) {
        matchedIndex = index;
        break;
      }
    }
    if (matchedIndex >= 0) {
      cssCookieArray.splice(matchedIndex, 1);
    }
    if (isDelete !== true) {
      cssCookieArray.unshift(key);
    }
  };
  /**
   * 缓存空间不够了，需要清除部分记录（目前清除一般的 cookie 值）
   */
  var clearCache = function() {
    var half = Math.floor(cssCookieArray.length / 2);
    var deleted = cssCookieArray.splice(half, cssCookieArray.length - half);
    for (var index = 0; index < deleted.length; index++) {
      var cssKey = deleted[index];
      var cssCacheKey = cssCachePrefix + cssKey;
      cssDeletedCache[cssKey] = localStorage.getItem(cssCacheKey);
      localStorage.removeItem(cssCacheKey);
    }
  };
  /**
   * 添加缓存
   * @param {CSSCache} css
   */
  var addCache = function(css, clear) {
    var cssKey = css.k;
    if (cssKey && css.s) {
      var cssCacheKey = cssCachePrefix + cssKey;
      try {
        localStorage.setItem(cssCacheKey, JSON.stringify(css));
        changeCookie(cssKey);
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
  var getCache = function(css) {
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
        changeCookie(css.k);
      }
    } catch (error) {
      console.error(error);
      changeCookie(cssKey, true); // 删除
      hasRestoreFailed = true;
    }
    return cssSource;
  };

  // css 更新
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
    var cssCookieValue = cssCookieArray
      .filter(function(key) {
        return !!key;
      })
      .reduce(function(rcc, key) {
        if (rcc.length > cookieLimit || (rcc + key).length > cookieLimit) {
          localStorage.removeItem(cssCachePrefix + key);
          return rcc;
        }
        if (rcc) {
          rcc += ',';
        }
        return rcc + key;
      }, '');
    var cssCookieExpired = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    doc.cookie = cssCookieKey + '=' + cssCookieValue + ';' + cssCookieExpired + ';path=/';
  } catch (error) {
    console.error(error);
  }

  if (hasRestoreFailed) {
    document.location.reload();
  }

  function getCookieItem(sKey) {
    return (
      document.cookie.replace(
        new RegExp(
          '(?:(?:^|.*;)\\s*' +
            sKey.replace(/[-.+*]/g, '\\$&') +
            '\\s*\\=\\s*([^;]*).*$)|^.*$'
        ),
        '$1'
      ) || ''
    );
  }
};

# 内联样式缓存

再 HTML 中使用内联样式可以提升首屏渲染速度，但是内联样式增加了 HTML 的大小，失去了缓存优势，这个库的作用就是缓存 HTML 中的内联样式。

## 用法

HTML 中使用 `window.inlineCSSCache([{k,n,s}])` 插入内联样式，k 是样式的版本号，n 是样式的名称，s 是样式源码。通过这样的方式注入的内联样式，会在当前网页域名中加入 cookie：`csses=k1,k2,k3`，服务端可以检测 Cookie 值来决定是否要下发对应的内联样式。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
  <script>
    // ... 引入该库
    window.inlineCSSCache([
      {
        k: '1',
        n： 'vendor',
        s: 'body:{color:red}'
      }, {
        k: '1',
        n: 'home',
        s: 'body:{color:red}'
      }
    ]);
  </script>
</head>
<body>
  
</body>
</html>
```

## 原理

![inline-css-cache.jpg](./doc/inline-css-cache.jpg)
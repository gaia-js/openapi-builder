# 协议生成工具
主要包含openapi文档生成（可以使用swagger工具查看）、接口代码生成（需要编写模版，目前主要支持gaia.js框架接口代码生成）

# 安装
 npm install @gaiajs/protocol_builder -g

# 组件

## 自动代码生成

### 使用方法
```
 npm run gencode
  --lang | -l <gaiajs|openapi>，可以多个参数，即同时生成多个代码或文档
  --input | -i <openapi.yaml | gapi.yaml>
  --type | -t <gapi|openapi> 输入文档类型，
  --output | -o <output path> 输出文件路径
```

## 由构建消息生成openapi文档

### 使用方法
 msggen2openapi -i ./msggen/ListenWorld/messages -o ./api.yaml -n listenworld

 name参数可以带多个，这样可以支持多服务器，如：

 msggen2openapi -i ./msggen/Nova/messages -o ./api.yaml -n novaeng novamath novachn

### 命令行参数

```
 Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  -i, --input   msggen messages directory path               [string] [required]
  -o, --output  output yaml file path                        [string] [required]
  -n, --name    application name                              [array] [required]
```
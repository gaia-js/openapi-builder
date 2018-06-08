# 由构建消息生成openapi文档

# 安装
 npm install 17zy_protocol_builder -g

# 使用方法
 msggen2openapi -i ./msggen/ListenWorld/messages -o ./api.yaml -n listenworld

 name参数可以带多个，这样可以支持多服务器，如：
 msggen2openapi -i ./msggen/Nova/messages -o ./api.yaml -n novaeng novamath novachn
 
# 命令行参数
 Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  -i, --input   msggen messages directory path               [string] [required]
  -o, --output  output yaml file path                        [string] [required]
  -n, --name    application name                              [array] [required]
  
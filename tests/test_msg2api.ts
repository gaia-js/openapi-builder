import msggen2Openapi from "../src/msggen2openapi";
import * as fs from 'fs';

msggen2Openapi("/Users/yonggang/17zuoye/src/vas/msggen/Nova/messages", './tests/openapi.yaml', ['novaeng', 'novamath', 'novachn']);

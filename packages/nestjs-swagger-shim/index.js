class DocumentBuilder {
  constructor(){this.doc={openapi:'3.0.0',info:{title:'',description:'',version:''},paths:{},components:{schemas:{}}};}
  setTitle(title){this.doc.info.title=title;return this;}
  setDescription(description){this.doc.info.description=description;return this;}
  setVersion(version){this.doc.info.version=version;return this;}
  build(){return this.doc;}
}
const noop=()=>()=>undefined;
const SwaggerModule={createDocument(_app,config){return {...config,paths:config.paths??{},components:config.components??{schemas:{}}};},setup(path,app,document){const server=app.getHttpAdapter?.(); const http=server?.getInstance?.(); if(http?.get){http.get(`/${path}`,(_req,res)=>res.type('html').send('<!doctype html><title>API Docs</title><pre id="openapi"></pre><script>fetch("/api/docs-json").then(r=>r.json()).then(j=>document.getElementById("openapi").textContent=JSON.stringify(j,null,2))</script>'));}}};
module.exports={DocumentBuilder,SwaggerModule,ApiTags:noop,ApiOperation:noop,ApiResponse:noop,ApiCreatedResponse:noop,ApiOkResponse:noop,ApiNoContentResponse:noop,ApiBadRequestResponse:noop,ApiNotFoundResponse:noop,ApiConflictResponse:noop,ApiParam:noop,ApiQuery:noop,ApiBody:noop,ApiProperty:noop,ApiPropertyOptional:noop};

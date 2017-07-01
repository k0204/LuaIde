import {LuaInfo, TokenInfo,  TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
export class LuaLeftCheck {
    private lp: LuaParse;
  
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }
  
    /**是否为 多变量声明  */
    public isMultipleVariables:boolean =false
    public luaInfos:Array<LuaInfo>;
    public parent:LuaInfo;
    public isLocal:boolean;
   
    public check(parent: LuaInfo) {
        this.luaInfos = new Array<LuaInfo>();
        this.isLocal = false;
        this.isMultipleVariables = false;
        this.parent = parent;
        //创建leftLuaInfo
        var toekn:TokenInfo = this.lp.getCurrentToken(null)
       
        var currentLuaInfo:LuaInfo = new LuaInfo(toekn)
        this.isLocal =  this.checkIsLocal(currentLuaInfo)
        if(this.lp.isError)return
        currentLuaInfo.isLocal = this.isLocal;
        currentLuaInfo.isVar = true
        if(this.isLocal)
        {
            currentLuaInfo.startToken = this.lp.getCurrentToken(null);
            currentLuaInfo.startToken.comments = this.lp.getUpToken().comments;
        }
        this.luaInfos.push(currentLuaInfo)
        this.checkLeftExoression(currentLuaInfo,new Array<LuaInfo>())
        currentLuaInfo = null
        
    }
    
    /**
     * 是否是local
     */
    public checkIsLocal(luaInfo:LuaInfo): boolean {
        var token = this.lp.getCurrentToken("代码未完成");
        if(this.lp.isError)return false
        var isLocal: boolean = this.lp.consume('local', token, TokenTypes.Keyword)
        if (isLocal) 
        {
            this.lp.tokenIndex++;
            luaInfo.setComments(token.comments)
        }
        return isLocal;
    }

    /**
     * 检查 变量声明
     * @isIdentifier 是否必须为 TokenTypes.Identifier 类型
     */
    public checkLeftExoression( leftLuaInfo: LuaInfo,leftLuaInfos:Array<LuaInfo>) {
       while(true)
       {
           CLog();
           this.lp.luaChuckInfo.check(leftLuaInfo,true)
           if(this.lp.isError)return
           //方法调用直接退出
           if(leftLuaInfo.type == LuaInfoType.FunctionCall1)
           {
               return
           }
           if(!leftLuaInfo.isNextCheck)
           {
              
               return;
           }

        var token:TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex+1,null)
        if(token == null)
        {
            if(leftLuaInfo.isLocal == false )
            {
                var last:LuaInfo= leftLuaInfo.getLastLuaInfo();
                // leftLuaInfo.type == LuaInfoType.Function
                var type = leftLuaInfo.type
                if(type != LuaInfoType.AnonymousFunction)
                {
                    this.lp.setError(leftLuaInfo.startToken, "没有赋值")
                }
                 
            }
             leftLuaInfo.setEndToken(this.lp.getCurrentToken(null))
            return
        }
        this.lp.tokenIndex++;
        //赋值
        if(this.lp.consume('=', token, TokenTypes.Punctuator) )
        {
            var endToken:TokenInfo =  this.lp.getUpToken()
            
            leftLuaInfos.push(leftLuaInfo)
            this.lp.tokenIndex++;
            //设置value
            this.lp.luaSetValue.check(true,true,leftLuaInfos)
            if(leftLuaInfo.type == LuaInfoType.Function)
            {
               this.lp.luaInfoManager.addFunctionCompletionItem(leftLuaInfo,endToken,this.lp.getUpToken())
            }else
            {
              leftLuaInfo.setEndToken(endToken);
            }
           
            return
        }
        else if(this.lp.consume(',', token, TokenTypes.Punctuator))
        {
           
            leftLuaInfo.setEndToken(this.lp.getUpToken())
            leftLuaInfos.push(leftLuaInfo)
            this.lp.tokenIndex++;
            this.isMultipleVariables = true
            var currentLuaInfo : LuaInfo = new LuaInfo(this.lp.getTokenByIndex(this.lp.tokenIndex,null))
            currentLuaInfo.isLocal = this.isLocal
            currentLuaInfo.isVar = true
            currentLuaInfo.ismultipleVariables = true
            this.luaInfos.push(currentLuaInfo)
            this.checkLeftExoression(currentLuaInfo,leftLuaInfos)
            return
        }
       else if(this.lp.consume(';', token, TokenTypes.Punctuator))
       {
            if(this.isLocal == false || (this.isLocal && this.isMultipleVariables))
            {
                this.lp.setError(this.lp.getCurrentToken(null), "没有赋值")
            
            }
             leftLuaInfo.setEndToken(this.lp.getUpToken())
            // this.lp.tokenIndex++;
            return
       }
        else
        {
            if(this.isLocal == false)
             {
                 if(token.type == TokenTypes.StringLiteral) 
                 {
                     return
                 }
                 else if(!this.lp.consume('=', token, TokenTypes.Punctuator) )
                 {
                     if(token.type == TokenTypes.Identifier){
this.lp.setError(this.lp.getTokenByIndex(this.lp.tokenIndex, null),"我猜测这是一个方法参数,但是请加()")
                     }
                      else
                      {
                          this.lp.setError(this.lp.getTokenByIndex(this.lp.tokenIndex-1, null),"没有赋值")
                      }
                      return false
                 }
             }
              leftLuaInfo.setEndToken(this.lp.getUpToken())
            this.lp.tokenIndex--;
              return
        } 
       }

    }



    public checkLastLuaInfoType(luaInfo:LuaInfo,type: LuaInfoType):boolean
    {
        while(true)
        {
            CLog();
            if(luaInfo.getNextLuaInfo() == null)
            {
                if(luaInfo.type ==  type)return true
                else return false
            }else
            {
                luaInfo =luaInfo.getNextLuaInfo();
            }
        }
    }

    
     
}
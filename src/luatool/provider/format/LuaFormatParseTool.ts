//import {LuaParse} from './LuaParse'
import { Range } from 'vscode-languageclient';
import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError } from '../../TokenInfo';
//import {CLog} from './Utils'
export class LuaFormatParseTool {
  //private lp:LuaParse;
  //当前解析到的位置
  private index: number = 0;
  //文本总长度
  private length: number = 0;

  public input: string = "";
  //当前解析的行
  private line: number = 0;
  //当前行开始的开始的位置
  private lineStart: number = 0;
  //标示符 或者 关键字 开始的 位置
  private tokenStart: number = 0;
  //当前块
  private token: TokenInfo;
  private tokens: Array<TokenInfo>;
  public formatComent: string = "";


  //方法缩进
  private funTabAdd: boolean = false;
  private funTabMCount: number = -1;
  private ignoreTabAdd: boolean = false;
  private Bracket_B: Array<boolean> = new Array<boolean>();

  private formatTabCount: number = null;
  private isDddTab: boolean = false;
  constructor(text: string) {
    this.Reset(text)
    this.tokens = new Array<TokenInfo>();

    while (true) {

      var token: TokenInfo = this.lex();
      if (token.error != null) {
        return;
      }
      if (token.type == TokenTypes.EOF) {
        token.value = ""
        this.tokens.push(token)
        break;
      }

      if (token.type == TokenTypes.Keyword && (
        token.value == "else" ||
        token.value == "elseif"
      )) {
        var tindex = this.tokens.length - 1


        while (true) {
          if (tindex >= 0) {
            if (this.tokens[tindex].type == TokenTypes.Wrap) {
              break;
            } else if (this.tokens[tindex].type == TokenTypes.Tab) {
              tindex--;
            } else {
              var Wraptoken: TokenInfo = new TokenInfo()
              Wraptoken.type = TokenTypes.Wrap;
              this.tokens.push(Wraptoken);
              Wraptoken.index = this.tokens.length
              break;

            }
          } else {
            break;
          }
        }

      }
      if (this.spaceCount > 0 && token.type == TokenTypes.Tab) {
        var ttoken: TokenInfo = new TokenInfo();
        ttoken.type = TokenTypes.Tab
        this.tokens.push(ttoken)
      }
      this.tokens.push(token);
      token.index = this.tokens.length;
      if (token.type != TokenTypes.Wrap) {

        //去掉空格
        this.skipWhiteSpace(true);
        if (this.tokens[this.tokens.length - 1].type != TokenTypes.Wrap) {
          //先判断有没有注释
          while (45 == this.input.charCodeAt(this.index) &&
            45 == this.input.charCodeAt(this.index + 1) &&
            this.input.charAt(this.index + 2) != '['
          ) {
            //如果有注释 将tab 全部删除

            while (true) {
              var tindex = this.tokens.length - 1;
              if (this.tokens[tindex].type == TokenTypes.Tab) {
                this.tokens.pop()
              } else {
                break
              }
            }
            //获取评论
            this.scanComment(token, true);

            if (this.tokens.length > 0) {
              if (this.tokens[this.tokens.length - 1].type != TokenTypes.Wrap) {
                var wtoken: TokenInfo = new TokenInfo()
                wtoken.type = TokenTypes.Wrap
                this.tokens.push(wtoken)
              }
            }

            break
          }
        }

      }

      else {
        var x = 1
      }

    }

    var content = "";
    var newWrap = false;
    for (var index = 0; index < this.tokens.length; index++) {
      var token = this.tokens[index];
      var nextToken: TokenInfo = null;
      if (index < this.tokens.length - 1) {
        nextToken = this.tokens[index + 1]
      }
      var upToken: TokenInfo = null
      if (index > 0) {
        upToken = this.tokens[index - 1]
      }
      //方法缩进
      if (token.type == TokenTypes.Keyword && token.value == "function") {
        this.funTabAdd = true;
      }


      if (this.funTabAdd) {
        if (token.type == TokenTypes.Punctuator && token.value == "(") {
          if (this.funTabMCount == -1) {
            this.funTabMCount = 1
          } else {
            this.funTabMCount++;
          }
        }
        if (token.type == TokenTypes.Punctuator && token.value == ")") {
          this.funTabMCount--
          if (this.funTabMCount == 0) {
            this.funTabMCount = -1;
            this.formatTabCount++;
            this.funTabAdd = false
          }
        }
      }
      //end 减少一个tab
      if (token.type == TokenTypes.Keyword && (
        token.value == "end" ||
        token.value == "until"
      )) {


        this.formatTabCount--;
        if (this.formatTabCount >= 0) {
          var tabCode = content.charCodeAt(content.length - 1)

          if (tabCode == 9) {
            content = content.slice(0, content.length - 1)
          }

        }

      }


      if (token.type == TokenTypes.Keyword && (
        token.value == "do" ||
        token.value == "then" ||
        token.value == "repeat"


      )) {
        if (this.ignoreTabAdd) {
          this.ignoreTabAdd = false;
        } else {
          this.formatTabCount++;
        }
      }

      if (token.type == TokenTypes.Wrap) {
        if (!newWrap) {
          content += "\n"
          newWrap = true
        }
        if (nextToken != null && nextToken.type == TokenTypes.Keyword &&
          (nextToken.value == "else" || nextToken.value == "elseif")) {
          if (nextToken.comments.length > 0) {
            for (var i = 0; i < this.formatTabCount; i++) {
              content += "\t"
            }
            nextToken.comments.forEach(comment => {
              if (comment.isLong) {
                content += "--[[" + comment.content + "]]\n";
              } else {
                content += "--" + comment.content + "\n";

              }
            });
          }
          this.formatTabCount--;
        }
        this.isDddTab = false;
        for (var i = 0; i < this.formatTabCount; i++) {
          content += "\t"
        }
        if (nextToken != null && nextToken.type == TokenTypes.Keyword &&
          (nextToken.value == "else")) {
          this.formatTabCount++;
        }
      } else if (token.type == TokenTypes.Tab) {
        if (this.isDddTab) {
          content += '\t'
        }
      }
      else {
        this.isDddTab = true;
        //{ /n

        if (token.type == TokenTypes.Punctuator && token.value == "{") {
          if (nextToken != null && nextToken.type == TokenTypes.Wrap) {
            this.Bracket_B.push(true)
            this.formatTabCount++;
          } else {
            this.Bracket_B.push(false)
          }
        }
        if (this.Bracket_B.length && token.type == TokenTypes.Punctuator && token.value == "}") {

          if (this.Bracket_B[this.Bracket_B.length - 1]) {
            this.formatTabCount--;
            if (upToken != null && upToken.type != TokenTypes.Wrap) {
              //手动换行
              content += "\n";
              for (var i = 0; i < this.formatTabCount; i++) {
                content += "\t"
              }
            } else if (upToken != null && upToken.type == TokenTypes.Wrap) {
              content = content.slice(0, content.length - 1)
            }
          }
          this.Bracket_B.pop();
        }
        //前注释
        if (token.comments.length > 0 && !(token.type == TokenTypes.Keyword && (token.value == "else" || token.value == "elseif"))) {
          token.comments.forEach(comment => {
            if (comment.isLong) {
              content += "--[[" + comment.content + "]]\n";
            } else {
              if (token.type == TokenTypes.Keyword && (
                token.value == "end" ||
                token.value == "until"
              )) {
                content += "\t"
              }
              content += "--" + comment.content + "\n";
            }
            for (var i = 0; i < this.formatTabCount; i++) {
              content += "\t"
            }
          });

        }

        if (
          (nextToken != null && nextToken.type != TokenTypes.Tab &&
            nextToken.type != TokenTypes.Wrap &&
            !(token.type == TokenTypes.Identifier && nextToken.type == TokenTypes.Punctuator && nextToken.value == '[') &&
            !(nextToken.value == '(' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == ',' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == ')' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == ']' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == ':' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == '}' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == ';' && nextToken.type == TokenTypes.Punctuator) &&
            !(nextToken.value == '.' && nextToken.type == TokenTypes.Punctuator)) &&

          !(token.value == '.' && token.type == TokenTypes.Punctuator) &&
          !(token.value == '(' && token.type == TokenTypes.Punctuator) &&
          !(token.value == ':' && token.type == TokenTypes.Punctuator) &&
          !(token.value == '{' && token.type == TokenTypes.Punctuator) &&
          !(token.value == '[' && token.type == TokenTypes.Punctuator) &&
          (token.aftecomments == null ||
            (token.aftecomments != null && token.aftecomments.length == 0))
        ) {
          content += this.getTokenValue(token) + " "
        } else {

          //如果为换行 和 \t 就直接添加
          content += this.getTokenValue(token);
        }

        if (token.aftecomments != null && token.aftecomments.length > 0) {
          token.aftecomments.forEach(comment => {
            content += comment.content;
          });
          // for (var i = 0; i < this.formatTabCount; i++) {
          //   content += "\t"
          // }
        }
      }
      if (token.type != TokenTypes.Tab && token.type != TokenTypes.Wrap) {
        newWrap = false

      }


    }


    this.formatComent = content

  }
  private getTokenValue(token: TokenInfo) {
    var content: string = ""

    //字符串 添加"" '' --[[]]
    if (token.type == TokenTypes.StringLiteral && token.delimiter != null) {



     
      token.value = token.value.replace(/\\/g, "\\\\");
      token.value = token.value.replace(/\t/g, "\\t");
      token.value = token.value.replace(/\n/g, "\\n");
      token.value = token.value.replace(/\f/g, "\\f");
      token.value = token.value.replace(/\r/g, "\\r");
      if (token.value == '"') {
        content += '\"\\\"\"'
      } else {
          token.value = token.value.replace(/\'/g, "\\'");
       token.value = token.value.replace(/\"/g, '\\"');
        content += token.delimiter + token.value + token.enddelimiter;
      }





    } else {
      content += token.value
    }

    return content
  }

  // 重置
  public Reset(text: string): void {
    this.input = text;
    //检查第一个字符是否为#
    this.index = 0;
    this.length = this.input.length;
    this.line = 0;
    this.lineStart = 0;
    if (this.input.charAt(0) == '#') {
      while (true) {
        if (this.consumeEOL(true)) {
          break
        } else {
          this.index++;
        }
      }
    }
  }
  public lex(): TokenInfo {
    var token = new TokenInfo();
    //去掉空格
    this.skipWhiteSpace(true);
    var isComment = false
    //先判断有没有注释
    while (45 == this.input.charCodeAt(this.index) &&
      45 == this.input.charCodeAt(this.index + 1)) {
      //获取评论
      this.scanComment(token, false);
      isComment = true
      this.skipWhiteSpace(false);
    }
    if (isComment) {
      if (this.tokens.length > 0) {
        if (this.tokens[this.tokens.length - 1].type != TokenTypes.Wrap) {
          var wtoken: TokenInfo = new TokenInfo()
          wtoken.type = TokenTypes.Wrap
          this.tokens.push(wtoken)
        }
      }
    }
    //没有下一个
    if (this.index >= this.length) {

      token.type = TokenTypes.EOF;
      token.value = '<eof>';
      token.line = this.line;
      token.lineStart = this.lineStart;
      token.range = new LuaRange(this.index, this.index)
      return token;
    }

    //开始正式解析变量了
    var charCode = this.input.charCodeAt(this.index)
    var next = this.input.charCodeAt(this.index + 1);

    // Memorize the range index where the token begins.
    this.tokenStart = this.index;
    if (this.isIdentifierStart(charCode)) {
      return this.scanIdentifierOrKeyword(token);
    }


    switch (charCode) {
      case 39: case 34: // '"
        return this.scanStringLiteral(token);

      // 0-9
      case 48: case 49: case 50: case 51: case 52: case 53:
      case 54: case 55: case 56: case 57:
        return this.scanNumericLiteral(token);

      case 46: // .
        // If the dot is followed by a digit it's a float.
        if (this.isDecDigit(next)) return this.scanNumericLiteral(token);
        if (46 === next) { // ..
          if (46 === this.input.charCodeAt(this.index + 2)) // ...
          {
            return this.scanVarargLiteral(token);
          }
          return this.scanPunctuator('..', token);
        }
        return this.scanPunctuator('.', token);

      case 61: // =
        if (61 === next) // ==
        {
          return this.scanPunctuator('==', token);
        }
        return this.scanPunctuator('=', token);

      case 62: // >
        if (61 === next)// >=
        {
          return this.scanPunctuator('>=', token);
        }
        if (62 === next) // >>
        {
          return this.scanPunctuator('>>', token);
        }
        return this.scanPunctuator('>', token);

      case 60: // <
        if (60 === next) {
          return this.scanPunctuator('<<', token);
        }
        if (61 === next) {
          return this.scanPunctuator('<=', token);
        }
        return this.scanPunctuator('<', token);

      case 126: // ~
        if (61 === next)//~=
        {
          return this.scanPunctuator('~=', token);
        }
        return this.scanPunctuator('~', token);

      case 58: // :
        if (58 === next) {
          //goto 标签
          return this.scanPunctuator('::', token);
        }
        return this.scanPunctuator(':', token);

      case 91: // [
        // Check for a multiline string, they begin with [= or [[
        if (91 === next || 61 === next) {
          //长字符串
          return this.scanLongStringLiteral(token);
        }
        return this.scanPunctuator('[', token);

      case 47: // /
        // Check for integer division op (//)
        if (47 === next) return this.scanPunctuator('//', token);
        return this.scanPunctuator('/', token);

      // * ^ % , { } ] ( ) ; & # - + |
      case 42: case 94: case 37: case 44: case 123: case 124: case 125:
      case 93: case 40: case 41: case 59: case 38: case 35: case 45: case 43:
        return this.scanPunctuator(this.input.charAt(this.index), token);
    }
    token.type = TokenTypes.Punctuator;
    token.value = this.input.charAt(this.index)
    return this.unexpected(token);


  }
  /**
   * 解析 ...
   */
  private scanVarargLiteral(token: TokenInfo): TokenInfo {
    this.index += 3;
    token.type = TokenTypes.VarargLiteral;
    token.value = '...';
    token.line = this.line;
    token.lineStart = this.lineStart;
    token.range = new LuaRange(this.tokenStart, this.index)
    return token;
  }


  /***
   * 解析数字
   *  */
  private scanNumericLiteral(token: TokenInfo): TokenInfo {
    var character: string = this.input.charAt(this.index);
    var next: string = this.input.charAt(this.index + 1);
    //这里需要检查 是否为 ..

    var value = 0;
    if ('0' === character && 'xX'.indexOf(next || null) >= 0) {
      value = this.readHexLiteral(token);
      if (token.error != null) {
        return token;
      }
    } else if (this.input.charAt(this.index + 2) != null && next === '.' && this.input.charAt(this.index + 2) === '.') {
      this.index++
      value = parseInt(character)
    }
    else {
      if (next)
        value = this.readDecLiteral(token);
      else {
        value = parseInt(character)
        this.index++;
      }

      if (token.error != null) {
        return token;
      }

    }
    token.type = TokenTypes.NumericLiteral;
    token.value = value;
    token.line = this.line;
    token.lineStart = this.lineStart;
    token.range = new LuaRange(this.tokenStart, this.index);
    return token;


  }

  /**
   * 读取非十进制数
   */
  private readHexLiteral(token: TokenInfo): number {
    var fraction: any = 0 // defaults to 0 as it gets summed
    var binaryExponent: any = 1 // defaults to 1 as it gets multiplied
    var binarySign: number = 1 // positive
    var digit: number;
    var fractionStart: number;
    var exponentStart: number;
    var digitStart: number = this.index += 2; // Skip 0x part



    //这里保证 16 进制 的最小 字符串长度 例: 0x:  那么就是违法的
    if (!this.isHexDigit(this.input.charCodeAt(this.index))) {

      token.line = this.line;
      token.lineStart = this.lineStart;
      token.range = new LuaRange(this.tokenStart, this.index)
      token.error = new LuaError(LuaErrorEnum.malformedNumber, this.input.slice(this.tokenStart, this.index))
      return 0;
    }


    while (this.isHexDigit(this.input.charCodeAt(this.index))) this.index++;
    // Convert the hexadecimal digit to base 10.
    digit = parseInt(this.input.slice(digitStart, this.index), 16);

    // Fraction part i optional.
    if ('.' === this.input.charAt(this.index)) {

      fractionStart = ++this.index;
      while (this.isHexDigit(this.input.charCodeAt(this.index))) this.index++;
      fraction = this.input.slice(fractionStart, this.index);

      // Empty fraction parts should default to 0, others should be converted
      // 0.x form so we can use summation at the end.
      fraction = (fractionStart === this.index) ? 0
        : parseInt(fraction, 16) / Math.pow(16, this.index - fractionStart);
    }

    // Binary exponents are optional
    if ('pP'.indexOf(this.input.charAt(this.index) || null) >= 0) {
      this.index++;

      // Sign part is optional and defaults to 1 (positive).
      if ('+-'.indexOf(this.input.charAt(this.index) || null) >= 0)
        binarySign = ('+' === this.input.charAt(this.index++)) ? 1 : -1;

      exponentStart = this.index;

      // The binary exponent sign requires a decimal digit.
      if (!this.isDecDigit(this.input.charCodeAt(this.index))) {
        token.line = this.line;
        token.lineStart = this.lineStart;
        token.range = new LuaRange(this.tokenStart, this.index)
        token.error = new LuaError(LuaErrorEnum.malformedNumber, this.input.slice(this.tokenStart, this.index))
        return 0;
      }


      while (this.isDecDigit(this.input.charCodeAt(this.index))) this.index++;
      binaryExponent = this.input.slice(exponentStart, this.index);

      // Calculate the binary exponent of the number.
      binaryExponent = Math.pow(2, binaryExponent * binarySign);
    }

    return (digit + fraction) * binaryExponent;
  }

  /**
   * 解析十进制数
   */
  private readDecLiteral(token: TokenInfo): number {

    while (this.isDecDigit(this.input.charCodeAt(this.index))) this.index++;
    // Fraction part is optional
    if ('.' === this.input.charAt(this.index)) {
      this.index++;
      //这里还需要进行判断 是否 为 ..
      // Fraction part defaults to 0
      while (true) {
        var codeNumber: number = this.input.charCodeAt(this.index)
        if (this.isDecDigit(codeNumber)) {
          this.index++;
        }
        else if (this.isWhiteSpace(codeNumber, false) || this.isLineTerminator(codeNumber)) {
          break
        } else if (';' === this.input.charAt(this.index)) {
          break
        }
        else if ('+' === this.input.charAt(this.index)) {
          break
        }
        else if ('-' === this.input.charAt(this.index)) {
          break
        }
        else if (',' === this.input.charAt(this.index)) {
          break
        }
        else if (']' === this.input.charAt(this.index)) {
          break
        }
        else if (')' === this.input.charAt(this.index)) {
          break
        }
        else if ('}' === this.input.charAt(this.index)) {
          break
        }
        else if ('*' === this.input.charAt(this.index)) {
          break
        }
        else if ('/' === this.input.charAt(this.index)) {
          break
        }
        else if ('^' === this.input.charAt(this.index)) {
          break
        }

        else if ('eE'.indexOf(this.input.charAt(this.index)) >= 0) {
          break
        }
        else {
          this.index++;
          token.line = this.line;
          token.lineStart = this.lineStart;
          token.range = new LuaRange(this.tokenStart, this.index)
          token.error = new LuaError(LuaErrorEnum.malformedNumber, this.input.slice(this.tokenStart, this.index))
          return
        }
      }
    }
    // Exponent part is optional.
    if ('eE'.indexOf(this.input.charAt(this.index) || null) >= 0) {
      this.index++;
      // Sign part is optional.
      if ('+-'.indexOf(this.input.charAt(this.index) || null) >= 0) this.index++;
      // An exponent is required to contain at least one decimal digit.
      if (!this.isDecDigit(this.input.charCodeAt(this.index))) {
        token.line = this.line;
        token.lineStart = this.lineStart;
        token.range = new LuaRange(this.tokenStart, this.index)
        token.error = new LuaError(LuaErrorEnum.malformedNumber, this.input.slice(this.tokenStart, this.index))
        return
      }
      while (this.isDecDigit(this.input.charCodeAt(this.index))) this.index++;
    }
    var chatat = this.input.charAt(this.index)
    var chatat1 = this.input.charAt(this.index + 1)
    if (this.isWhiteSpace(this.input.charCodeAt(this.index), false) ||
      this.isLineTerminator(this.input.charCodeAt(this.index)) ||
      ';' === chatat ||
      '' === chatat ||
      ']' === chatat ||
      ')' === chatat ||
      ',' === chatat ||
      '}' === chatat ||
      chatat == '+' ||
      chatat == '-' ||
      chatat == '*' ||
      chatat == '/' ||
      chatat == '>' ||
      chatat == '>' ||
      chatat == ',' ||
      chatat == '}' ||
      chatat == '^' ||

      ('=' == chatat && '=' == chatat1) ||
      ('>' == chatat && '=' == chatat1) ||
      ('<' == chatat && '=' == chatat1) ||
      ('~' == chatat && '=' == chatat1)
    ) {
      return parseFloat(this.input.slice(this.tokenStart, this.index));
    } else {
      this.index++;
      token.line = this.line;
      token.lineStart = this.lineStart;
      token.range = new LuaRange(this.tokenStart, this.index)
      token.error = new LuaError(LuaErrorEnum.malformedNumber, this.input.slice(this.tokenStart, this.index))
    }



  }
  /**
 * 获取注释
 */
  private scanComment(token: TokenInfo, afterComment: boolean): void {
    //  this.tokenStart = this.index;
    this.index += 2;
    //当前字符
    var character = this.input.charAt(this.index);
    //注释内容
    var content;
    // 是否为长注释  --[[  长注释 ]]
    var isLong = false;
    var commentStart = this.index;
    var lineStartComment = this.lineStart;
    var lineComment = this.line;

    if ('[' == character) {
      content = this.readLongString(null);
      if (content == false) {
        content = character;
      }
      else {
        isLong = true;
      }
    }
    if (!isLong) {
      var isLineT: boolean = false
      var cindex = 0
      while (this.index < this.length) {
        var charCode: number = this.input.charCodeAt(this.index)
        if (this.isLineTerminator(charCode)) {

          isLineT = true
          var peekCharCode = this.input.charCodeAt(this.index + 1);
          //判断是否换行
          if (10 === charCode && 13 === peekCharCode) {
            this.index++;
          }
          if (13 === charCode && 10 === peekCharCode) {

            this.index++;
          }
          if (cindex == 0) {
            cindex = this.index
          }
          this.line++;
          this.lineStart = ++this.index;

          if (afterComment) {
            break;
          }

        } else {
          if (isLineT) {
            break
          }
          this.index++;
        }

      }
      cindex = cindex == 0 ? this.index : cindex
      if (afterComment) {
        content = this.input.slice(token.range.end, cindex);
      } else {
        content = this.input.slice(commentStart, cindex);
      }



    }
    var range = {
      start: { line: lineComment, character: lineStartComment },
      end: { line: this.lineStart, character: cindex - this.lineStart }
    }
    if (afterComment) {
      token.addAfterComment(new LuaComment(content, range, isLong));
    } else {
      token.addComment(new LuaComment(content, range, isLong));
    }



  }
  /**
    * 获取长字符串
    *  * return 
    *          为长字符串 content
    *          不为长字符串  false
    */
  private readLongString(token: TokenInfo): any {
    //多少个  等于符号
    var level: number = 0;
    //注释内容  
    var content: string = '';
    var terminator: boolean = false;
    var character: string = null;
    var stringStart: number = 0;
    var beginDIndex: number = this.index;
    this.index++; //将位置移到 需要判断的字符  上已阶段以及判断到了 [
    // 获取等于符号的多少

    while ('=' === this.input.charAt(this.index + level)) {
      level++;
    }
    // 如果是[ 那么继续 如果不为 [ 那么 直接返回
    if ('[' !== this.input.charAt(this.index + level)) {
      return false;
    }
    this.index += level + 1;
    if (this.isLineTerminator(this.input.charCodeAt(this.index))) {
      this.consumeEOL(false);
    }
    //注释开始的位置
    stringStart = this.index;
    if (token) {
      token.delimiter = this.input.slice(beginDIndex, stringStart)
    }

    // 读取注释内容
    while (this.index < this.length) {
      while (true) {
        if (this.isLineTerminator(this.input.charCodeAt(this.index))) {
          this.consumeEOL(false);
        } else {
          break;
        }
      }
      var endDindex = this.index
      character = this.input.charAt(this.index++);

      if (']' == character) {

        terminator = true;
        for (var i = 0; i < level; i++) {
          if ('=' !== this.input.charAt(this.index + i)) {
            terminator = false;
          }
        }
        if (']' !== this.input.charAt(this.index + level)) {
          terminator = false;
        }

        if (token) {
          var endDstr = this.input.slice(endDindex, this.index + level + 1)
          token.enddelimiter = endDstr
        }
      }
      if (terminator) break;

    }
    if (terminator) {
      content += this.input.slice(stringStart, this.index - 1);
      this.index += level + 1;
      return content;
    } return false;

  }
  /**
    * 读取转义符
    */
  private readEscapeSequence(): string {
    var sequenceStart = this.index;
    switch (this.input.charAt(this.index)) {
      // Lua allow the following escape sequences.
      // We don't escape the bell sequence.
      case 'n': this.index++; return '\n';
      case 'r': this.index++; return '\r';
      case 't': this.index++; return '\t';
      case 'v': this.index++; return '\x0B';
      case 'b': this.index++; return '\b';
      case 'f': this.index++; return '\f';
      // Skips the following span of white-space.
      case 'z': this.index++; this.skipWhiteSpace(false); return '';
      // Byte representation should for now be returned as is.
      case 'x':
        // \xXX, where XX is a sequence of exactly two hexadecimal digits
        if (this.isHexDigit(this.input.charCodeAt(this.index + 1)) &&
          this.isHexDigit(this.input.charCodeAt(this.index + 2))) {
          this.index += 3;
          // Return it as is, without translating the byte.
          return '\\' + this.input.slice(sequenceStart, this.index);
        }
        return '\\' + this.input.charAt(this.index++);
      default:
        // \ddd, where ddd is a sequence of up to three decimal digits.
        if (this.isDecDigit(this.input.charCodeAt(this.index))) {
          while (this.isDecDigit(this.input.charCodeAt(++this.index)));
          return '\\' + this.input.slice(sequenceStart, this.index);
        }
        // Simply return the \ as is, it's not escaping any sequence.
        return this.input.charAt(this.index++);
    }
  }
  private scanStringLiteral(token: TokenInfo): TokenInfo {
    token.delimiter = this.input.charAt(this.index)
    token.enddelimiter = token.delimiter;
    var delimiter: number = this.input.charCodeAt(this.index++);

    var stringStart: number = this.index;
    var str: string = '';
    var charCode: number;

    while (this.index < this.length) {
      charCode = this.input.charCodeAt(this.index++);
      // ===  ' or "
      if (delimiter === charCode) break;
      if (92 === charCode) { // \
        str += this.input.slice(stringStart, this.index - 1) + this.readEscapeSequence();
        stringStart = this.index;
      }
      //"->没有了   or " ->换行了
      else if (this.index >= this.length || this.isLineTerminator(charCode)) {
        str += this.input.slice(stringStart, this.index - 1);
        token.line = this.line;
        token.lineStart = this.lineStart;
        token.range = new LuaRange(stringStart, this.index)
        token.error = new LuaError(LuaErrorEnum.unfinishedString, str + String.fromCharCode(charCode))
        return token;
      }
    }
    str += this.input.slice(stringStart, this.index - 1);

    token.type = TokenTypes.StringLiteral;
    token.value = str;
    token.line = this.line;
    token.lineStart = this.lineStart;
    token.range = new LuaRange(stringStart, this.index)
    return token;
  }
  /**
   * 解析长字符串
   */
  private scanLongStringLiteral(token: TokenInfo): TokenInfo {
    var str = this.readLongString(token);
    // Fail if it's not a multiline literal.
    if (false === str) {

      token.line = this.line;
      token.lineStart = this.lineStart;
      token.range = new LuaRange(this.tokenStart, this.index)
      token.error = new LuaError(LuaErrorEnum.expected, '[ 长字符串未 结尾   [[  ]]')
    } else {
      token.type = TokenTypes.StringLiteral;


      token.value = str;
      token.line = this.line;
      token.lineStart = this.lineStart;
      token.range = new LuaRange(this.tokenStart, this.index)
    }
    return token;
  }
  /**
   * 异常
   */
  private unexpected(token: TokenInfo): TokenInfo {


    var error: LuaError = new LuaError(LuaErrorEnum.unexpected, token.value);
    var value: string = token.value + ""

    token.range = new LuaRange(this.tokenStart, this.tokenStart + value.length)
    token.line = this.line;
    token.lineStart = this.lineStart;
    token.error = error;
    return token;
  }
  /**
    * 解析标点
    */
  private scanPunctuator(value: string, token: TokenInfo): TokenInfo {

    this.index += value.length;
    token.type = TokenTypes.Punctuator;
    token.value = value;
    token.line = this.line;
    token.lineStart = this.lineStart;
    token.range = new LuaRange(this.tokenStart, this.index)
    return token;
  }


  /**
   * 跳过空格
   */
  private skipWhiteSpace(isAddWrapToken: boolean): void {
    while (this.index < this.length) {
      var charCode = this.input.charCodeAt(this.index);
      //空格 解析
      if (this.isWhiteSpace(charCode, true)) {
        this.index++;
      }
      //解析换行 
      else if (!this.consumeEOL(isAddWrapToken)) {
        break;
      }
    }
  }
  private EOLIndex: number = 0;
  /**
   * 解析换行
   */
  private consumeEOL(isAddWrapToken: boolean): boolean {
    var charCode = this.input.charCodeAt(this.index);
    var peekCharCode = this.input.charCodeAt(this.index + 1);
    //判断是否换行
    if (this.isLineTerminator(charCode)) {
      if (10 === charCode && 13 === peekCharCode) this.index++;
      if (13 === charCode && 10 === peekCharCode) this.index++;
      this.line++;
      this.lineStart = ++this.index;
      if (isAddWrapToken) {
        if (this.EOLIndex < this.index) {
          var currenToken: TokenInfo = null
          if (this.tokens.length > 0) {
            currenToken = this.tokens[this.tokens.length - 1]
          }
          if (currenToken == null || currenToken.type != TokenTypes.Wrap) {
            var token: TokenInfo = new TokenInfo()
            token.type = TokenTypes.Wrap;
            this.tokens.push(token);
          }

        }


      }
      this.EOLIndex = this.index;
      return true;
    }
    return false;
  }
  // private isspaceTab: boolean = true;
  private spaceCount: number = 0;
  private spaceIndex: number = -1;
  /**
  * 判断是否是空格
  *  */
  public isWhiteSpace(charCode, isAddTab: boolean): boolean {
    if (9 === charCode) {
      if (this.spaceIndex != this.index) {
        if (isAddTab) {


          var currenToken = null;
          if (this.tokens.length > 0) currenToken = this.tokens[this.tokens.length - 1]
          if (currenToken != null && currenToken.type != TokenTypes.Wrap) {

            var token: TokenInfo = new TokenInfo();
            token.type = TokenTypes.Tab
            this.tokens.push(token)
          }
        }


      }
      this.spaceIndex = this.index
      return true
    }
    if (32 === charCode || 0xB === charCode || 0xC === charCode) {
      if (this.spaceIndex != this.index) {
        this.spaceCount++;
        if (isAddTab) {


          if (this.spaceCount == 4) {
            if (this.tokens.length > 0) currenToken = this.tokens[this.tokens.length - 1]
            if (currenToken != null && currenToken.type != TokenTypes.Wrap) {
              var token: TokenInfo = new TokenInfo();
              token.type = TokenTypes.Tab
              this.tokens.push(token)
            }

            this.spaceCount = 0;
          }
        }
      }
      this.spaceIndex = this.index
      return true
    } else {
      this.spaceCount = 0;
      this.spaceIndex = this.index
      return false;
    }

  }
  /**
   * 判断是否换行
   *  */
  public isLineTerminator(charCode): boolean {
    return 10 === charCode || 13 === charCode;
  }

  /**
   * 判断是否是关键字
   */
  public isKeyword(id): boolean {
    switch (id.length) {
      case 2:
        return 'do' === id || 'if' === id || 'in' === id || 'or' === id;
      case 3:
        return 'and' === id || 'end' === id || 'for' === id || 'not' === id;
      case 4:
        return 'else' === id || 'goto' === id || 'then' === id;
      case 5:
        return 'break' === id || 'local' === id || 'until' === id || 'while' === id;
      case 6:
        return 'elseif' === id || 'repeat' === id || 'return' === id;
      case 8:
        return 'function' === id;
    }
    return false;
  }
  /**
   * 判断是否是一个表示符号的起点是否合法  如 一个变量名 或者一个方法 名   a-z  A-Z   _  只能是这些
   */
  private isIdentifierStart(charCode): boolean {
    return (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || 95 === charCode;
  }

  /**
   * 判断是否是标示符除 起点外的内容是否合法
   */
  private isIdentifierPart(charCode): boolean {
    return (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || 95 === charCode || (charCode >= 48 && charCode <= 57);
  }

  /**
   * 判断是否为十进制的数字
   */
  private isDecDigit(charCode) {
    return charCode >= 48 && charCode <= 57;
  }
  /**
   * 判断是否为数字     0 - 9  a-z  A-Z
   */
  private isHexDigit(charCode) {
    return (charCode >= 48 && charCode <= 57) || (charCode >= 97 && charCode <= 102) || (charCode >= 65 && charCode <= 70);
  }

  /**
  * 解析 表示符号 或者 关键字
  * 
  */
  private scanIdentifierOrKeyword(token: TokenInfo): TokenInfo {
    var value: any = null;
    var type;

    //循环检查 标志符 或者关键字
    while (this.isIdentifierPart(this.input.charCodeAt(++this.index)));
    //获取token
    value = this.input.slice(this.tokenStart, this.index);


    if (this.isKeyword(value)) {
      type = TokenTypes.Keyword;
    } else if ('true' === value || 'false' === value) {
      type = TokenTypes.BooleanLiteral;
      value = ('true' === value);
    } else if ('nil' === value) {
      type = TokenTypes.NilLiteral;
      value = 'nil';
    } else {
      type = TokenTypes.Identifier;
    }

    token.type = type;
    token.value = value;
    token.line = this.line;
    token.lineStart = this.lineStart;
    token.range = new LuaRange(this.tokenStart, this.index)


    return token;
  }
}

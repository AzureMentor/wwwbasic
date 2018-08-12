// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

(function() {
  var BLACK = 0xff000000;
  var WHITE = 0xffffffff;

  var CHARSET =
    '\u0020\u263a\u263b\u2665\u2666\u2663\u2660\u2022' +
    '\u25d8\u25cb\u25d9\u2642\u2640\u266a\u266b\u263c' +
    '\u25ba\u25c4\u2195\u203c\u00b6\u00a7\u25ac\u21a8' +
    '\u2191\u2193\u2192\u2190\u221f\u2194\u25b2\u25bc' +
    '\u0020\u0021\u0022\u0023\u0024\u0025\u0026\u0027' +
    '\u0028\u0029\u002a\u002b\u002c\u002d\u002e\u002f' +
    '\u0030\u0031\u0032\u0033\u0034\u0035\u0036\u0037' +
    '\u0038\u0039\u003a\u003b\u003c\u003d\u003e\u003f' +
    '\u0040\u0041\u0042\u0043\u0044\u0045\u0046\u0047' +
    '\u0048\u0049\u004a\u004b\u004c\u004d\u004e\u004f' +
    '\u0050\u0051\u0052\u0053\u0054\u0055\u0056\u0057' +
    '\u0058\u0059\u005a\u005b\u005c\u005d\u005e\u005f' +
    '\u0060\u0061\u0062\u0063\u0064\u0065\u0066\u0067' +
    '\u0068\u0069\u006a\u006b\u006c\u006d\u006e\u006f' +
    '\u0070\u0071\u0072\u0073\u0074\u0075\u0076\u0077' +
    '\u0078\u0079\u007a\u007b\u007c\u007d\u007e\u2302' +
    '\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7' +
    '\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5' +
    '\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9' +
    '\u00ff\u00d6\u00dc\u00a2\u00a3\u00a5\u20a7\u0192' +
    '\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba' +
    '\u00bf\u2310\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb' +
    '\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556' +
    '\u2555\u2563\u2551\u2557\u255d\u255c\u255b\u2510' +
    '\u2514\u2534\u252c\u251c\u2500\u253c\u255e\u255f' +
    '\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u2567' +
    '\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256b' +
    '\u256a\u2518\u250c\u2588\u0020\u258c\u2590\u2580' +
    '\u03b1\u00df\u0393\u03c0\u03a3\u03c3\u00b5\u03c4' +
    '\u03a6\u0398\u03a9\u03b4\u221e\u03c6\u03b5\u2229' +
    '\u2261\u00b1\u2265\u2264\u2320\u2321\u00f7\u2248' +
    '\u00b0\u2219\u00b7\u221a\u207f\u00b2\u25a0\u0020';

  function NextChar(ch) {
    return String.fromCharCode(ch.charCodeAt(0) + 1);
  }

  function CreateFont(ctx, height) {
    var data = new Uint8Array(256 * 8 * height);
    var pos = 0;
    for (var i = 0; i < 256; ++i) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 16, 32);
      ctx.textBaseline = 'top';
      ctx.font = 'bold 16px monospace';
      ctx.save();
      ctx.scale(1, height / 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(CHARSET.charAt(i), 0, 0);
      ctx.restore();
      var pix = ctx.getImageData(0, 0, 8, height);
      var pdata = pix.data;
      for (var j = 0; j < pdata.length; j+=4) {
        var level = pdata[j] * 0.1140 +
                    pdata[j + 1] * 0.5870 +
                    pdata[j + 2] * 0.2989;
        data[pos++] = level > 128 ? 255 : 0;
      }
    }
    return data;
  }

  function Interpret(code, canvas) {
    // Display Info (in browser only).
    var screen_mode = 0;
    var screen_bpp = 4;
    var text_width = 80;
    var text_height = 60;
    var font_height = 16;
    var screen_aspect = 1;
    var font_data;
    var ctx;
    var display;
    var display_data;
    var scale_canvas;

    function SetupDisplay(width, height, aspect, fheight) {
      if (!canvas) {
        return;
      }
      ctx = canvas.getContext('2d', { alpha: false });
      display = ctx.createImageData(width, height);
      display_data = new Uint32Array(display.data.buffer);
      if (!scale_canvas) {
        scale_canvas = document.createElement('canvas');
      }
      scale_canvas.width = width;
      scale_canvas.height = height;
      text_width = Math.floor(width / 8);
      text_height = Math.floor(height / fheight);
      screen_aspect = aspect;
      font_height = fheight;
      var sctx = scale_canvas.getContext('2d', { alpha: false});
      font_data = CreateFont(sctx, font_height);
    }

    Screen(0);

    var debugging_mode = typeof debug == 'boolean' && debug;
    // Parsing and Run State.
    var labels = {};
    var data_labels = {};
    var flow = [];
    var types = {};
    var subroutines = {};
    var functions = {};
    var global_vars = {};
    var vars = global_vars;
    var allocated = 0;
    var str_count = 0;
    var array_count = 0;
    var const_count = 0;
    var var_decls = '';
    var vars_getput = {};
    var rstack = [];
    var data = [];
    var data_pos = 0;
    var ops = [];
    var curop = '';
    var ip = 0;

    // Input State
    var keys = [];
    var mouse_x = 0;
    var mouse_y = 0;
    var mouse_buttons = 0;
    var mouse_wheel = 0;
    var mouse_clip = 0;

    // Language Options
    var option_base = 0;
    var option_explicit = false;

    // Variable declaration defaults.
    var letter_default = {};
    // Default is single.
    var i = 'a';
    do {
      letter_default[i] = 'Float32Array';
      i = NextChar(i);
    } while (i != 'z');

    // Yield State
    var yielding = 0;
    var quitting = 0;
    var delay = 0;

    // Drawing and Console State
    var color_map;
    var reverse_color_map;
    var fg_color = WHITE;
    var bg_color = BLACK;
    var text_x = 0;
    var text_y = 0;
    var pen_x = 0;
    var pen_y = 0;

    var toklist = [
      ':', ';', ',', '(', ')', '{', '}', '[', ']',
      '+=', '-=', '*=', '/=', '\\=', '^=', '&=',
      '+', '-', '*', '/', '\\','^', '&',
      '<=', '>=', '<>', '=>', '=', '<', '>', '@', '\n',
    ];
    if (canvas) {
      code = code.replace(/&lt;/g, '<');
      code = code.replace(/&gt;/g, '>');
      code = code.replace(/&amp;/g, '&');
    }

    var tok = null;
    var line = canvas ? 0 : 1;

    function Next() {
      tok = '';
      for (;;) {
        while (code.substr(0, 1) == ' '  ||
               code.substr(0, 1) == '\t') {
          if (tok != '') {
            return;
          }
          code = code.substr(1);
        }
        if (code.search(/^_[ \t]*('[^\n]*)?\n/) != -1) {
          if (tok != '') {
            return;
          }
          code = code.substr(code.search('\n') + 1);
          ++line;
          continue;
        }
        if (code.substr(0, 1) == '\'') {
          if (tok != '') {
            return;
          }
          while (code.length > 0 && code.substr(0, 1) != '\n') {
            code = code.substr(1);
          }
          continue;
        }
        if (code.substr(0, 1) == '"') {
          if (tok != '') {
            return;
          }
          tok = '"';
          code = code.substr(1);
          while (code.length > 0 && code.substr(0, 1) != '"') {
            if (code.substr(0, 1) == '\n') {
              // Allow strings to cut off at end of line.
              // GW-Basic seems to allow it.
              tok += '"';
              return;
            }
            tok += code.substr(0, 1);
            code = code.substr(1);
          }
          tok += '"';
          code = code.substr(1);
          return;
        }
        if (tok == '' && /[.0-9][#]?/.test(code.substr(0, 1))) {
          var n = code.match(/^([0-9]*([.][0-9]*)?([eE][+-]?[0-9]+)?[#]?)/);
          if (n === null) {
            Throw('Bad number');
          }
          tok = n[1];
          code = code.substr(tok.length);
          return;
        }
        for (var i = 0; i < toklist.length; ++i) {
          if (code.substr(0, toklist[i].length) == toklist[i]) {
            if (tok != '') {
              if (code.substr(0, 1) == '&' &&
                code.substr(code.length-1) != '$') {
                tok += '&';
                code = code.substr(1);
              }
              return;
            }
            tok = toklist[i];
            code = code.substr(toklist[i].length);
            if (tok == '\n') {
              ++line;
              tok = '<EOL>';
            } else if (tok == '&' && code.substr(0, 1).toLowerCase() == 'h') {
              code = code.substr(1);
              var n = code.match(/^([0-9a-fA-F]+)/);
              if (n === null) {
                Throw('Bad hex number');
              }
              tok = '0x' + n[1];
              code = code.substr(n[1].length);
            }
            return;
          }
        }
        tok += code.substr(0, 1).toLowerCase();
        code = code.substr(1);
        if (code == '') {
          return;
        }
      }
    }
    Next();

    function ConsumeData() {
      var quote = false;
      var had_quote = false;
      var item = '';
      for (;;) {
        var ch = code.substr(0, 1);
        if (ch == '\n' || ch == '') {
          if (!had_quote) {
            if (!quote) {
              item = item.trim();
            }
            data.push(item);
          }
          break;
        } else if (ch == '"') {
          if (quote) {
            data.push(item);
            item = '';
            quote = false;
            had_quote = true;
          } else {
            quote = true;
            if (item.search(/[^ \t]/) != -1) {
              Throw('Data statement extra text: "' + item + '"');
            }
            item = '';
          }
        } else if (ch == ',') {
          if (!quote) {
            if (!had_quote) {
              data.push(item.trim());
            } else {
              had_quote = false;
              if (item.search(/[^ \t]/) != -1) {
                Throw('Data statement extra text: "' + item + '"');
              }
            }
            item = '';
          } else {
            item += ',';
          }
        } else {
          item += ch;
        }
        code = code.substr(1);
      }
      Next();
    }

    function Throw(msg) {
      throw msg + ' at line ' + line;
    }

    function Skip(t) {
      if (tok != t) {
        Throw('Expected "'+ t + '" found "' + tok + '"');
      }
      Next();
    }

    function NewOp() {
      ops.push(curop);
      curop = '';
    }

    function If(e, n) {
      if (n === undefined) {
        n = [];
      }
      NewOp();
      ops[ops.length - 1] += 'if (!(' + e + ')) { ip = ';
      flow.push(['if', ops.length - 1, []]);
    }

    function Else() {
      var f = flow.pop();
      if (f[0] != 'if') {
        Throw('ELSE unmatched to IF');
      }
      NewOp();
      var pos = ops.length - 1;
      ops[pos] += 'ip = ';
      NewOp();
      ops[f[1]] += ops.length + '; }\n';
      flow.push(['else', null, f[2].concat(pos)]);
    }

    function ElseIf(e) {
      var f = flow.pop();
      if (f[0] != 'if') {
        Throw('ELSEIF unmatched to IF');
      }
      NewOp();
      var pos = ops.length - 1;
      ops[pos] += 'ip = ';
      NewOp();
      ops[f[1]] += ops.length + '; }\n';
      NewOp();
      ops[ops.length - 1] += 'if (!(' + e + ')) { ip = ';
      flow.push(['if', ops.length - 1, f[2].concat([pos])]);
    }

    function EndIf() {
      NewOp();
      var f = flow.pop();
      if (f[0] == 'else') {
        // nothing needed
      } else if (f[0] == 'if') {
        ops[f[1]] += ops.length + '; }\n';
      } else {
        Throw('Unmatch end if');
      }
      for (var i = 0; i < f[2].length; ++i) {
        ops[f[2][i]] += ops.length + ';\n';
      }
    }

    function AddLabel(name) {
      if (labels[name] !== undefined) {
        Throw('Label ' + name + ' defined twice');
      }
      NewOp();
      curop += '// LABEL ' + name + ':\n';
      labels[name] = ops.length;
      data_labels[name] = data.length;
    }

    function Factor3() {
      if (tok == '(') {
        Skip('(');
        var ret = Expression();
        Skip(')');
        return ret;
      } else {
        var name = tok;
        Next();
        if (name.substr(0, 1) == '"' ||
            /^[0-9]*([.][0-9]*)?([eE][+-]?[0-9]+)?$/.test(name) ||
            /^0x[0-9a-fA-F]+$/.test(name)) {
          return name;
        }
        if (name == 'rnd') {
          if (tok == '(') {
            Skip('(');
            if (tok != ')') {
              var e = Expression();
            }
            Skip(')');
          }
          return 'Math.random()';
        }
        if (name == 'log' || name == 'ucase$' || name == 'lcase$' ||
            name == 'chr$' || name == 'sqr' || name == 'int' ||
            name == 'abs' || name == 'len' ||
            name == 'cos' || name == 'sin' || name == 'tan' || name == 'atn' ||
            name == 'exp' || name == 'str$' || name == 'peek') {
          Skip('(');
          var e = Expression();
          Skip(')');
          switch (name) {
            case 'log': return 'Math.log(' + e + ')';
            case 'ucase$': return '(' + e + ').toUpperCase()';
            case 'lcase$': return '(' + e + ').toLowerCase()';
            case 'chr$': return 'String.fromCharCode(' + e + ')';
            case 'asc': return '(' + e + ').toCharCode(0)';
            case 'sqr': return 'Math.sqrt(' + e + ')';
            case 'int': return 'Math.floor(' + e + ')';
            case 'abs': return 'Math.abs(' + e + ')';
            case 'cos': return 'Math.cos(' + e + ')';
            case 'sin': return 'Math.sin(' + e + ')';
            case 'tan': return 'Math.tan(' + e + ')';
            case 'atn': return 'Math.atan(' + e + ')';
            case 'exp': return 'Math.exp(' + e + ')';
            case 'str$': return '(' + e + ').toString()';
            case 'peek': return 'Peek(' + e + ').toString()';
            case 'len': return '((' + e + ').length)';
          }
          Throw('This cannot happen');
        }
        if (name == 'atan2' || name == 'string$') {
          Skip('(');
          var a = Expression();
          Skip(',');
          var b = Expression();
          Skip(')');
          if (name == 'atan2') {
            return 'Math.atan2(' + a + ', ' + b + ')';
          } else if (name == 'string$') {
            return 'StringRep(' + a + ', ' + b + ')';
          }
        }
        if (name == 'inkey$') {
          return 'Inkey()';
        }
        if (name == 'timer') {
          return 'GetTimer()';
        }
        return IndexVariable(name);
      }
    }

    function Factor2() {
      var a = Factor3();
      while (tok == '^') {
        Next();
        var b = Factor3();
        a = 'Math.pow(' + a + ', ' + b + ')';
      }
      return a;
    }

    function Factor1() {
      var ret = '';
      while (tok == '+' || tok == '-') {
        ret += tok;
        Next();
      }
      return ret + '(' + Factor2() + ')';
    }

    function Factor() {
      var a = Factor1();
      while (tok == '*' || tok == '/') {
        var op = tok;
        Next();
        var b = Factor1();
        a = '(' + a + ')' + op + '(' + b + ')';
      }
      return a;
    }

    function Term2() {
      var a = Factor();
      while (tok == '\\') {
        var b = Next();
        Factor();
        a = '(' + a + ')//(' + b + ')';
      }
      return a;
    }

    function Term1() {
      var a = Term2();
      while (tok == 'mod') {
        Next();
        var b = Term2();
        a = '((' + a + ')%(' + b + '))';
      }
      return a;
    }

    function Term() {
      var a = Term1();
      while (tok == '+' || tok == '-') {
        var op = tok;
        Next();
        var b = Term1();
        a = '(' + a + ')' + op + '(' + b + ')';
      }
      return a;
    }

    function Relational() {
      var a = Term();
      while (tok == '=' || tok == '<' || tok == '>' ||
             tok == '<>' || tok == '<=' || tok == '>=' || tok == '=>') {
        var op = tok;
        Next();
        if (op == '=>') {
          op = '>=';
        }
        var b = Term();
        if (op == '=') {
          a = '(' + a + ') == (' + b + ') ? -1 : 0';
        } else if (op == '<>') {
          a = '(' + a + ') != (' + b + ') ? -1 : 0';
        } else {
          a = '(' + a + ') ' + op + ' (' + b + ') ? -1 : 0';
        }
      }
      return a;
    }

    function Logical1() {
      var ret = '';
      while (tok == 'not') {
        Next();
        ret += '~';
      }
      return ret + '(' + Relational() + ')';
    }

    function Logical() {
      var a = Logical1();
      while (tok == 'and') {
        Next();
        var b = Logical1();
        a = '(' + a + ') & (' + b + ')';
      }
      return a;
    }

    function Expression() {
      var a = Logical();
      while (tok == 'or') {
        Next();
        var b = Logical();
        a = '(' + a + ') | (' + b + ')';
      }
      return a;
    }

    function TypeName() {
      if (tok == 'byte') {
        Skip('byte');
        return 'Uint8Array';
      } else if (tok == 'single') {
        Skip('single');
        return 'Float32Array';
      } else if (tok == 'double') {
        Skip('double');
        return 'Float64Array';
      } else if (tok == 'integer') {
        Skip('integer');
        return 'Int32Array';
      } else if (tok == 'long') {
        Skip('long');
        return 'Int32Array';
      } else if (tok == 'string') {
        Skip('string');
        return 'Array';
      } else if (tok == 'any') {
        Skip('any');
        return 'Array';
      } else if (types[tok] !== undefined) {
        var t = types[tok];
        Next();
        // TODO: Implement.
        return 'Array';
      }
      Throw('Undefined type "' + tok + '"');
    }

    var TYPE_ARRAY_MAP = {
      'Uint8Array': 'b',
      'Int16Array': 'i16',
      'Int32Array': 'i',
      'Float32Array': 's',
      'Float64Array': 'd',
      'Array': 'str',
    };

    var TYPE_SIZE_MAP = {
      'Uint8Array': 1,
      'Int16Array': 2,
      'Int32Array': 4,
      'Float32Array': 4,
      'Float64Array': 8,
      'Array': 1,
    };

    function ImplicitType(name) {
      if (name[name.length-1] == '$') {
        // TODO: String Array Init.
        return 'Array';
      } else if (name[name.length-1] == '%') {
        return 'Int16Array';
      } else if (name[name.length-1] == '&') {
        return 'Int32Array';
      } else if (name[name.length-1] == '!') {
        return 'Float32Array';
      } else if (name[name.length-1] == '#') {
        return 'Float64Array';
      } else {
        return letter_default[name[0]] || 'Float32Array';
      }
    }

    function DimScalarVariable(name, type_name, defaults) {
      var size = TYPE_SIZE_MAP[type_name];
      var index;
      if (type_name == 'Array') {
        index = str_count++;
      } else {
        allocated = Math.floor((allocated + size - 1) / size) * size;
        index = allocated / size;
        allocated += size;
      }
      var code = TYPE_ARRAY_MAP[type_name] + '[' + index + ']';
      var_decls += '// ' + code + ' is ' + name + '\n';
      if (defaults.length > 0) {
        curop += code + ' = ' + defaults[0] + ';\n';
      }
      vars[name] = {
        code: code,
        dimensions: [],
      };
    }

    function ImplicitDimVariable(name) {
      // TODO: Handle array variables.
      var type_name = ImplicitType(name);
      DimScalarVariable(name, type_name, []);
      return vars[name];
    }

    function ImplicitDimGetPut(name) {
      if (vars[name] !== undefined) {
        return vars[name].code;
      }
      if (vars_getput[name] === undefined) {
        vars_getput[name] = array_count++;
      }
      return 'a' + vars_getput[name];
    }

    function DimVariable(default_tname, redim) {
      var name = tok;
      Next();
      // Pick default.
      if (default_tname === null) {
        default_tname = ImplicitType(name);
      }
      var type_name = default_tname;
      var dimensions = [];
      var defaults = [];
      if (tok == '(') {
        Skip('(');
        while (tok != ')') {
          var e = Expression();
          var d = 'dim' + const_count++;
          var_decls += 'const ' + d + ' = (' + e + ');\n';
          if (tok == 'to') {
            Skip('to');
            var e1 = Expression();
            var d1 = 'dim' + const_count++;
            var_decls += 'const ' + d1 + ' = (' + e1 + ');\n';
            dimensions.push([d, d1]);
          } else {
            dimensions.push([option_base, d]);
          }
          if (tok != ',') {
            break;
          }
          Skip(',');
        }
        Skip(')');
        if (tok == '=') {
          Skip('=');
          Skip('{');
          var e = Expression();
          defaults.push(e);
          while (tok == ',') {
            Skip(',');
            var e = Expression();
            defaults.push(e);
          }
          Skip('}');
        }
      } else if (tok == '=') {
        Skip('=');
        var e = Expression();
        defaults.push(e);
      }
      if (tok == 'as') {
        Skip('as');
        type_name = TypeName();
      }
      if (!redim && vars[name] !== undefined) {
        Throw('Variable ' + name + ' defined twice');
      }
      // name, dims.
      if (dimensions == 0) {
        DimScalarVariable(name, type_name, defaults);
      } else {
        var index;
        if (vars_getput[name] !== undefined) {
          index = vars_getput[name];
        } else {
          index = array_count++;
        }
        var code = 'a' + index;
        var_decls += 'var ' + code + ';  // ' + name + '\n';
        var parts = [];
        for (var i = 0; i < dimensions.length; i++) {
          parts.push('((' + dimensions[i][1] + ')-(' +
            dimensions[i][0] + ')+1)');
        }
        curop += 'if (' + code + ' === undefined) {\n';
        curop += '  ' + code + ' = new ' + type_name +
          '(' + parts.join('*') + ');\n';
        if (defaults.length > 0) {
          for (var i = 0; i < defaults.length; i++) {
            curop += '  ' + code + '[' + i + '] = (' + defaults[i] + ');\n';
          }
        }
        curop += '}\n';
        vars[name] = {
          code: code,
          dimensions: dimensions,
        };
      }
    }

    function IndexVariable(name) {
      var v = vars[name];
      if (v === undefined) {
        if (option_explicit) {
          Throw('Undeclared variable ' + name);
        } else {
          v = ImplicitDimVariable(name);
        }
      }
      var vname = v.code;
      while (tok == '(' || tok == '.') {
        if (tok == '(') {
          Skip('(');
          var dims = [];
          var e = Expression();
          dims.push(e);
          while (tok == ',') {
            Skip(',');
            var e = Expression();
            dims.push(e);
          }
          Skip(')');
          vname += '[';
          for (var i = 0; i < dims.length; ++i) {
            if (i >= v.dimensions.length) {
              Throw('Bad array name: ' + name);
            }
            vname += '(((' + dims[i] + ')|0)-' + v.dimensions[i][0] + ')';
            for (var j = 0; j < i; ++j) {
              vname += '*(' + v.dimensions[j][1] + '-' +
                v.dimensions[j][0] + ' + 1)';
            }
            if (i != dims.length - 1) {
              vname += '+';
            }
          }
          vname += ']';
        } else if (tok == '.') {
          Skip('.');
          Next();
          // TODO
        }
      }
      return vname;
    }

    function End() {
      yielding = 1;
      quitting = 1;
      if (canvas) {
        console.log('BASIC END');
      } else {
        if (output_buffer != '') {
          PutCh('\n');
        }
      }
    }

    function Sleep(t) {
      yielding = 1;
      delay = t;
    }

    function Inkey() {
      yielding = 1;
      if (keys.length > 0) {
        return keys.shift();
      } else {
        return '';
      }
    }

    function Yield() {
      yielding = 1;
    }

    function StringRep(n, ch) {
      var ret = '';
      var cch;
      if (typeof ch == 'string') {
        cch = ch;
      } else {
        cch = String.fromCharCode(ch);
      }
      for (var i = 0; i < n; ++i) {
        ret += cch;
      }
      return ret;
    }

    function Peek(addr) {
      return 0;
    }

    function RGB(r, g, b) {
      return BLACK | r | (g << 8) | (b << 16);
    }

    function Screen(mode) {
      if (!canvas) {
        return;
      }
      // TODO: Handle color right in CGA, EGA, VGA modes.
      var L = 0x55, M = 0xAA, H = 0xFF;
      var monochrome = [BLACK, WHITE];
      var rgba = [
        RGB(0, 0, 0), RGB(0, 0, M), RGB(0, M, 0), RGB(0, M, M),
        RGB(M, 0, 0), RGB(M, 0, M), RGB(M, L, 0), RGB(M, M, M),
        RGB(L, L, L), RGB(L, L, H), RGB(L, H, L), RGB(L, H, H),
        RGB(H, L, L), RGB(H, L, H), RGB(H, H, L), RGB(H, H, H),
      ];
      var screen1 = [
        BLACK, RGB(0, M, M), RGB(M, 0, M), RGB(M, M, M),
      ];
      var modes = {
        0: [640, 200, 2.4, 8, rgba, 4],
        1: [320, 200, 1.2, 8, screen1, 2],
        2: [640, 200, 2.4, 8, monochrome, 1],
        7: [320, 200, 1.2, 8, rgba, 4],
        8: [640, 200, 2.4, 8, rgba, 4],
        9: [640, 350, 480 / 350, 14, rgba, 4],
        11: [640, 480, 1, 16, monochrome, 2],
        12: [640, 480, 1, 16, rgba, 4],
        13: [320, 200, 1.2, 8, undefined, 24],
        14: [320, 240, 1, 16, undefined, 24],
        15: [400, 300, 1, 16, undefined, 24],
        16: [512, 384, 1, 16, undefined, 24],
        17: [640, 400, 1.2, 16, undefined, 24],
        18: [640, 480, 1, 16, undefined, 24],
        19: [800, 600, 1, 16, undefined, 24],
        20: [1024, 768, 1, 16, undefined, 24],
        21: [1280, 1024, 1, 16, undefined, 24],
      };
      var m = modes[mode];
      if (m === undefined) {
        Throw('Invalid mode ' + mode);
      }
      SetupDisplay(m[0], m[1], m[2], m[3]);
      color_map = m[4];
      screen_bpp = m[5];
      reverse_color_map = {};
      if (color_map !== undefined) {
        for (var i = 0; i < color_map.length; ++i) {
          reverse_color_map[color_map[i]] = i;
        }
        fg_color = color_map[color_map.length - 1];
        bg_color = color_map[0];
      } else {
        fg_color = WHITE;
        bg_color = BLACK;
      }
      screen_mode = mode;
      pen_x = display.width / 2;
      pen_y = display.height / 2;
      Cls();
    }

    function Width(w) {
      if (w == 80 || w == 40) {
        SetupDisplay(w * 8, display.height, screen_aspect, font_height);
      }
    }

    var output_buffer = '';

    function PutCh(ch) {
      if (!canvas) {
        if (ch == '\n') {
          console.log(output_buffer);
          output_buffer = '';
        } else {
          output_buffer += ch;
        }
        return;
      }
      if (ch == '\n') {
        text_x = 0;
        text_y++;
        return;
      }
      var fg = fg_color;
      var bg = bg_color;
      var chpos = ch.charCodeAt(0) * font_height * 8;
      for (var y = 0; y < font_height; ++y) {
        var pos = text_x * 8 + (y + text_y * font_height) * display.width;
        for (var x = 0; x < 8; ++x) {
          display_data[pos++] = font_data[chpos++] ? fg : bg;
        }
      }
      text_x++;
      if (text_x > text_width) {
        text_y++;
        text_x = 0;
      }
    }

    function Print(items) {
      if (items.length == 0) {
        PutCh('\n');
        return;
      }
      for (var i = 0; i < items.length; i += 2) {
        var text;
        if (items[i] === undefined) {
          text = '';
        } else {
          text = items[i].toString();
        }
        for (var j = 0; j < text.length; j++) {
          PutCh(text[j]);
        }
        if (items[i+1] == ',') {
          PutCh(' ');
          PutCh(' ');
          PutCh(' ');
        }
        if (items[i+1] != ';' && items[i+1] != ',') {
          PutCh('\n');
        }
      }
    }

    function Using(format, value) {
      var sgn = value < 0 ? -1 : (value > 0 ? 1 : 0);
      value = Math.abs(value);
      var before = 0;
      var after = 0;
      var found_point = false;
      for (var i = 0; i < format.length; ++i) {
        if (format[i] == '.') {
          found_point = true;
        } else if (format[i] == '#') {
          if (found_point) {
            ++after;
          } else {
            ++before;
          }
        }
      }
      var t = value;
      var fail = Math.floor(t * Math.pow(10, -before)) > 0;
      value = value * Math.pow(10, after);
      var ret = '';
      var done = false;
      for (var i = format.length - 1; i >= 0; --i) {
        if (format[i] == '#') {
          if (fail) {
            ret = '*' + ret;
          } else if (done) {
            ret = ' ' + ret;
          } else {
            ret = Math.floor(value % 10) + ret;
            value = Math.floor(value / 10);
            if (value == 0) {
              done = true;
            }
          }
        } else if (format[i] == '+' || format[i] == '-') {
          if (fail) {
            ret = '*' + ret;
          } else if (sgn < 0) {
            ret = '-' + ret;
          } else if (sgn > 0) {
            if (format[i] == '+') {
              ret = '+' + ret;
            }
          } else {
            ret = ' ' + ret;
          }
        } else if (format[i] == ',') {
          if (fail) {
            ret = '*' + ret;
          } else if (done) {
            ret = ' ' + ret;
          } else {
            ret = ',' + ret;
          }
        } else {
          ret = format[i] + ret;
        }
      }
      return ret;
    }

    function PrintUsing(format, items) {
      for (var i = 0; i < items.length; i += 2) {
        items[i] = Using(format, items[i]);
      }
      Print(items);
    }

    function ColorFlip(c) {
      return BLACK |
        ((c & 0xff0000) >> 16) | ((c & 0xff) << 16) | (c & 0x00ff00);
    }

    function FixupColor(c) {
      if (c === undefined) {
        if (color_map) {
          return color_map[color_map.length - 1];
        } else {
          return WHITE;
        }
      }
      c = c | 0;
      if (color_map !== undefined) {
        return color_map[c] || BLACK;
      } else {
        return ColorFlip(c);
      }
    }

    function Color(fg, bg) {
      if (screen_mode == 0 || screen_mode > 2) {
        fg_color = FixupColor(fg);
      } else {
        fg_color = FixupColor(undefined);
      }
      if (screen_mode > 0) {
        bg_color = 0;
      } else {
        bg_color = FixupColor(bg);
      }
    }

    function Locate(x, y) {
      text_x = x - 1;
      text_y = y - 1;
    }

    function Box(x1, y1, x2, y2, c) {
      x1 = x1 | 0;
      y1 = y1 | 0;
      x2 = x2 | 0;
      y2 = y2 | 0;
      c = c | 0;
      if (x1 > x2) {
        var t = x2;
        x2 = x1;
        x1 = t;
      }
      if (y1 > y2) {
        var t = y2;
        y2 = y1;
        y1 = t;
      }
      if (x1 >= display.width ||
          y1 >= display.height ||
          x2 < 0 || y2 < 0) {
        return;
      }
      if (x1 < 0) x1 = 0;
      if (x2 > display.width - 1) x2 = display.width - 1;
      if (y1 < 0) y1 = 0;
      if (y2 > display.height - 1) y2 = display.height - 1;
      for (var y = y1; y <= y2; ++y) {
        var pos = x1 + y * display.width;
        for (var x = x1; x <= x2; ++x) {
          display_data[pos++] = c;
        }
      }
    }

    function RawLine(x1, y1, x2, y2, c) {
      x1 = x1 | 0;
      y1 = y1 | 0;
      x2 = x2 | 0;
      y2 = y2 | 0;
      if (x1 == x2 || y1 == y2) {
        Box(x1, y1, x2, y2, c);
        return;
      }
      if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
        if (x1 > x2) {
          var tmp;
          tmp = x1; x1 = x2; x2 = tmp;
          tmp = y1; y1 = y2; y2 = tmp;
        }
        for (var x = x1; x <= x2; ++x) {
          var t = (x - x1) / (x2 - x1);
          var y = y1 + Math.floor(t * (y2 - y1));
          Box(x, y, x, y, c);
        }
      } else {
        if (y1 > y2) {
          var tmp;
          tmp = x1; x1 = x2; x2 = tmp;
          tmp = y1; y1 = y2; y2 = tmp;
        }
        for (var y = y1; y <= y2; ++y) {
          var t = (y - y1) / (y2 - y1);
          var x = x1 + Math.floor(t * (x2 - x1));
          Box(x, y, x, y, c);
        }
      }
    }

    function Line(x1, y1, x2, y2, c, fill) {
      var pen_color = FixupColor(c);
      if (fill == 0) {
        // Should be line.
        RawLine(x1, y1, x2, y2, pen_color);
      } else if (fill == 1) {
        Box(x1, y1, x2, y1, pen_color);
        Box(x1, y2, x2, y2, pen_color);
        Box(x1, y1, x1, y2, pen_color);
        Box(x2, y1, x2, y2, pen_color);
      } else {
        Box(x1, y1, x2, y2, pen_color);
      }
    }
    var last = 0;

    function Cls() {
      Box(0, 0, display.width, display.height, BLACK);
      text_x = 0;
      text_y = 0;
    }

    function Pset(x, y, c) {
      var pen_color = FixupColor(c);
      display_data[x + y * display.width] = pen_color;
      pen_x = x;
      pen_y = y;
    }

    function Circle(x, y, r, c, start, end, aspect, fill) {
      var pen_color = FixupColor(c);
      // TODO: Handle aspect.
      if (fill) {
        for (var i = -r; i <= r; ++i) {
          var dx = Math.sqrt(r * r - i * i);
          Box(x - dx, y + i, x + dx, y + i, pen_color);
        }
      } else {
        for (var i = -r; i <= r; ++i) {
          var dx = Math.sqrt(r * r - i * i);
          Box(x - dx, y + i, x - dx, y + i, pen_color);
          Box(x + dx, y + i, x + dx, y + i, pen_color);
        }
      }
    }

    function GetImage(x1, y1, x2, y2, buffer) {
      x1 = x1 | 0;
      y1 = y1 | 0;
      x2 = x2 | 0;
      y2 = y2 | 0;
      var d16 = new Uint16Array(buffer.buffer);
      if (screen_bpp <= 2) {
        d16[0] = (x2 - x1 + 1) * screen_bpp;
      } else {
        d16[0] = (x2 - x1 + 1);
      }
      d16[1] = y2 - y1 + 1;
      var d = new Uint8Array(buffer.buffer);
      var src = display_data;
      if (screen_bpp > 8) {
        var dstpos = 4;
        for (var y = y1; y <= y2; ++y) {
          var srcpos = x1 + y * display.width;
          for (var x = x1; x <= x2; ++x) {
            var v = src[srcpos++];
            d[dstpos++] = v;
            d[dstpos++] = (v >> 8);
            d[dstpos++] = (v >> 16);
          }
        }
      } else {
        var dstpos = 4;
        var shift = 8;
        var v = 0;
        for (var y = y1; y <= y2; ++y) {
          var srcpos = x1 + y * display.width;
          for (var x = x1; x <= x2; ++x) {
            shift -= screen_bpp;
            var cc = reverse_color_map[src[srcpos++] | BLACK] | 0;
            v |= (cc << shift);
            if (shift == 0) {
              d[dstpos++] = v;
              v = 0;
              shift = 8;
            }
          }
          if (shift != 8) {
            d[dstpos++] = v;
            v = 0;
            shift = 8;
          }
        }
      }
    }

    function PutImage(x1, y1, buffer, mode) {
      x1 = x1 | 0;
      y1 = y1 | 0;
      var s16 = new Uint16Array(buffer.buffer);
      var x2;
      if (screen_bpp <= 2) {
        x2 = x1 + (s16[0] / screen_bpp) - 1;
      } else {
        x2 = x1 + s16[0] - 1;
      }
      var y2 = y1 + s16[1] - 1;
      var s = new Uint8Array(buffer.buffer);
      var dst = display_data;
      if (screen_bpp > 8) {
        var srcpos = 4;
        for (var y = y1; y <= y2; ++y) {
          var dstpos = x1 + y * display.width;
          for (var x = x1; x <= x2; ++x) {
            var v = s[srcpos] | (s[srcpos + 1] << 8) | (s[srcpos + 2] << 16);
            srcpos += 3;
            if (mode == 'xor') {
              dst[dstpos++] = (dst[dstpos] ^ v) | BLACK;
            } else if (mode == 'preset') {
              dst[dstpos++] = (~v) | BLACK;
            } else if (mode == 'and') {
              dst[dstpos++] = (dst[dstpos] & v) | BLACK;
            } else if (mode == 'or') {
              dst[dstpos++] = (dst[dstpos] | v) | BLACK;
            } else {
              dst[dstpos++] = v | BLACK;
            }
          }
        }
      } else {
        var srcpos = 4;
        var mask = (1 << screen_bpp) - 1;
        for (var y = y1; y <= y2; ++y) {
          var dstpos = x1 + y * display.width;
          var v = 0;
          var shift = 8;
          for (var x = x1; x <= x2; ++x) {
            if (shift == 8) {
              v = s[srcpos++];
            }
            shift -= screen_bpp;
            var cc = (v >> shift) & mask;
            var old = reverse_color_map[dst[dstpos] | BLACK] | 0;
            if (mode == 'xor') {
              cc ^= old;
            } else if (mode == 'preset') {
              cc = cc ^ mask;
            } else if (mode == 'and') {
              cc &= old;
            } else if (mode == 'or') {
              cc |= old;
            }
            var px = color_map[cc] | 0;
            dst[dstpos++] = px;
            if (shift == 0) {
              shift = 8;
            }
          }
        }
      }
    }

    var draw_state = {
      noplot: false,
      nomove: false,
      angle: 0,
      turn_angle: 0,
      color: undefined,
      scale: 1,
    };

    function StepUnscaled(dx, dy) {
      if (!draw_state.noplot) {
        Line(pen_x, pen_y, pen_x + dx, pen_y + dy, draw_state.color, 0);
      }
      if (!draw_state.nomove) {
        pen_x += dx;
        pen_y += dy;
      }
      draw_state.noplot = false;
      draw_state.nomove = false;
    }

    function Step(dx, dy) {
      StepUnscaled(dx * draw_state.scale, dy * draw_state.scale);
    }

    function Draw(cmds) {
      cmds = cmds.toLowerCase();
      var m;
      while (cmds.length) {
        if (m = cmds.match(/^(u|d|l|r|e|f|g|h|a|ta|c|s)([0-9]+)?/)) {
          var op = m[1];
          var n = m[2] == '' ? 1 : parseInt(m[2]);
          if (op == 'c') {
            draw_state.color = n;
          } else if (op == 'a') {
            draw_state.angle = n;
            // TODO: Implement.
          } else if (op == 'ta') {
            draw_state.turn_angle = n;
            // TODO: Implement.
          } else if (op == 's') {
            draw_state.scale = n / 4;
          } else if (op == 'u') {
            Step(0, -n);
          } else if (op == 'd') {
            Step(0, n);
          } else if (op == 'l') {
            Step(-n, 0);
          } else if (op == 'r') {
            Step(n, 0);
          } else if (op == 'e') {
            Step(n, -n);
          } else if (op == 'f') {
            Step(n, n);
          } else if (op == 'g') {
            Step(-n, n);
          } else if (op == 'h') {
            Step(-n, -n);
          }
        } else if (m = cmds.match(/^(m)([+-]?)([0-9]+)[,]([+-]?[0-9]+)/)) {
          var op = m[1];
          var sx = m[2];
          var x = parseInt(m[3]);
          var y = parseInt(m[4]);
          if (sx) {
            x = parseInt(sx + '1') * x;
            Step(x, y);
          } else {
            StepUnscaled(x - pen_x, y - pen_y);
          }
        } else if (m = cmds.match(/^(p)([0-9]+),([0-9]+1)/)) {
          var op = m[1];
          var x = parseInt(m[2]);
          var y = parseInt(m[3]);
          // TODO: Implement.
        } else if (m = cmds.match(/^(b|n)/)) {
          var op = m[1];
          if (op == 'b') {
            draw_state.noplot = true;
          } else if (op == 'n') {
            draw_state.nomove = true;
          }
        } else {
          Throw('Bad drop op: ' + cmds);
        }
        cmds = cmds.substr(m[0].length);
      }
    }

    function Paint(x, y, paint, border) {
      paint = FixupColor(paint);
      if (border === undefined) {
        border = paint;
      } else {
        border = FixupColor(border) & 0xffffff;
      }
      var fpaint = paint & 0xffffff;
      var data = display_data;
      var pending = [];
      pending.push([Math.floor(x), Math.floor(y)]);
      while (pending.length) {
        var p = pending.pop();
        if (p[0] < 0 || p[0] >= display.width ||
            p[1] < 0 || p[1] >= display.height) {
          continue;
        }
        var pos = p[0] + p[1] * display.width;
        if ((data[pos] & 0xffffff) == border ||
            (data[pos] & 0xffffff) == fpaint) {
          continue;
        }
        data[pos] = paint;
        pending.push([p[0] - 1, p[1]]);
        pending.push([p[0] + 1, p[1]]);
        pending.push([p[0], p[1] - 1]);
        pending.push([p[0], p[1] + 1]);
      }
    }

    function GetVar() {
      var name = tok;
      Next();
      if (vars[name] === undefined) {
        if (option_explicit) {
          Throw('Unknown variable ' + name);
        } else {
          ImplicitDimVariable(name);
        }
      }
      return vars[name];
    }

    var DEFAULT_TYPES = {
      'defdbl': 'Float64Array',
      'defsng': 'Float32Array',
      'defint': 'Int32Array',
      'deflng': 'Int32Array',
      'defstr': 'Array',
    };

    function Statement() {
      if (tok == '<EOL>') {
        // Ignore empty lines.
      } else if (tok == 'rem') {
        do {
          Next();
        } while (tok != '<EOL>');
      } else if (tok == 'if') {
        Skip('if');
        var e = Expression();
        Skip('then');
        if (tok == ':' || tok == '<EOL>') {
          If(e);
          while (tok == ':') {
            Skip(':');
            Statement();
          }
          if (tok == 'else') {
            Skip('else');
            Else();
            while (tok == ':') {
              Skip(':');
              Statement();
            }
          }
          if (tok == 'end') {
            Skip('end');
            Skip('if');
            EndIf();
          }
        } else {
          // Classic if <e> then
          If(e);
          if (tok.match(/^[0-9]+$/)) {
            var name = tok;
            Next();
            curop += 'ip = labels["' + name + '"];\n';
            NewOp();
          } else {
            Statement();
            while (tok == ':') {
              Skip(':');
              Statement();
            }
          }
          var f = flow.pop();
          if (f[0] != 'if') {
            Throw('If in mixed style');
          }
          flow.push(f);
          NewOp();
          if (tok == 'else') {
            Skip('else');
            Else();
            Statement();
            while (tok == ':') {
              Skip(':');
              Statement();
            }
          }
          EndIf();
        }
      } else if (tok == 'elseif') {
        Skip('elseif');
        var e = Expression();
        Skip('then');
        ElseIf(e);
      } else if (tok == 'else') {
        Skip('else');
        Else();
      } else if (tok == 'do') {
        Skip('do');
        NewOp();
        flow.push(['do', ops.length]);
      } else if (tok == 'loop') {
        Skip('loop');
        if (tok == 'while') {
          Skip('while');
        } else if (tok == 'until') {
          Skip('until');
          // TODO
        } else {
          Throw('Expected while/until');
        }
        var e = Expression();
        var f = flow.pop();
        if (f[0] != 'do') {
          Throw('Loop does not match do');
        }
        curop += 'if (' + e + ') { ip = ' + f[1] + '; }\n';
      } else if (tok == 'while') {
        Skip('while');
        var e = Expression();
        NewOp();
        curop += 'if (!(' + e + ')) { ip = ';
        NewOp();
        flow.push(['while', ops.length-1]);
      } else if (tok == 'wend') {
        Skip('wend');
        var f = flow.pop();
        if (f[0] != 'while') {
          Throw('Wend does not match while');
        }
        curop += 'ip = ' + f[1] + ';\n';
        NewOp();
        ops[f[1]] += ops.length + '; }\n';
      } else if (tok == 'end') {
        Skip('end');
        if (tok == 'if') {
          Skip('if');
          EndIf();
        } else if (tok == 'select') {
          Skip('select');
          NewOp();
          var f = flow.pop();
          if (f[0] != 'select') {
            Throw('end select outside select');
          }
          var disp = 'var t = (' + f[1] + ');\n';
          disp += 'if (false) {}\n';
          for (var i = 0; i < f[3].length; i++) {
            var ii = f[3][i];
            if (ii[0] == ii[1]) {
              disp += 'else if (t == (' + ii[0] +
                      ')) { ip = ' + ii[2] + '; }\n';
            } else {
              disp += 'else if (t >= (' + ii[0] + ') && t <= (' + ii[1] +
                      ')) { ip = ' + ii[2] + '; }\n';
            }
          }
          if (f[5] !== null) {
            disp += 'else { ip = ' + f[5] + '; }\n';
          } else {
            disp += 'else { ip = ' + ops.length + '; }\n';
          }
          ops[f[2]] += disp;
          for (var i = 0; i < f[4].length; i++) {
            ops[f[4][i]] += 'ip = ' + ops.length + ';\n';
          }
        } else {
          curop += 'End();\n';
        }
      } else if (tok == 'goto') {
        Skip('goto');
        var name = tok;
        Next();
        curop += 'ip = labels["' + name + '"];\n';
        NewOp();
      } else if (tok == 'gosub') {
        Skip('gosub');
        var name = tok;
        Next();
        curop += 'rstack.push(ip);\n';
        curop += 'ip = labels["' + name + '"];\n';
        NewOp();
      } else if (tok == 'return') {
        Skip('return');
        curop += 'ip = rstack.pop();\n';
        NewOp();
      } else if (tok == 'declare') {
        Skip('declare');
        if (tok == 'sub') {
          Skip('sub');
          var name = tok;
          Next();
          subroutines[name] = {};
          vars = {};
          Skip('(');
          if (tok != ')') {
            DimVariable(tname);
            while (tok == ',') {
              Skip(',');
              DimVariable(tname);
            }
          }
          Skip(')');
          vars = global_vars;
        } else if (tok == 'function') {
          Skip('function');
          var name = tok;
          Next();
          functions[name] = {};
          vars = {};
          Skip('(');
          if (tok != ')') {
            DimVariable(tname);
            while (tok == ',') {
              Skip(',');
              DimVariable(tname);
            }
          }
          Skip(')');
          vars = global_vars;
        } else {
          Throw('Unexpected declaration');
        }
      } else if (tok == 'type') {
        vars = {};
        Skip('type');
        var type_name = tok;
        Next();
        types[type_name] = {};
        Skip('<EOL>');
        while (tok != 'end') {
          while (tok != '<EOL>') {
            DimVariable(null);
            while (tok == ',') {
              Skip(',');
              DimVariable(null);
            }
          }
          Skip('<EOL>');
        }
        Skip('end');
        Skip('type');
        vars = global_vars;
      } else if (tok == 'const') {
        Skip('const');
        for (;;) {
          var name = tok;
          Next();
          var v = vars[name];
          if (v !== undefined) {
            Throw('Constant ' + name + ' defined twice');
          }
          vars[name] = {
            code: 'c' + const_count++,
          };
          v = vars[name];
          Skip('=');
          var value = Expression();
          var_decls += 'const ' + v.code +
            ' = (' + value + ');  // ' + name + '\n';
          if (tok == ',') {
            Skip(',');
            continue;
          }
          break;
        }
      } else if (tok == 'dim' || tok == 'redim') {
        var op = tok;
        Next();
        if (tok == 'shared') {
          Skip('shared');
        }
        var tname = null;
        if (tok == 'as') {
          Skip('as');
          tname = TypeName();
        }
        DimVariable(tname, op == 'redim');
        while (tok == ',') {
          Skip(',');
          DimVariable(tname, op == 'redim');
        }
      } else if (tok == 'on') {
        Skip('on');
        if (tok == 'error') {
          Skip('error');
        } else {
          Throw('Expected error');
        }
        if (tok == 'goto') {
          Skip('goto');
          var name = tok;
          Next();
          // TODO: Implement.
        } else {
          Throw('Expected goto');
        }
      } else if (tok == 'resume') {
        Skip('resume');
        if (tok == 'next') {
          Skip('next');
          // TODO: Implement.
        } else if (tok == '0') {
          Skip('0');
          // TODO: Implement.
        } else if (tok != '<EOL>' && tok != ':') {
          var name = tok;
          Next();
          // TODO: Implement.
        } else {
          // TODO: Implement.
        }
      } else if (tok == 'def') {
        Skip('def');
        if (tok == 'seg') {
          Skip('seg');
          if (tok == '=') {
            Skip('=');
            var e = Expression();
            // TODO: Do something useful with it?
          }
        } else if (tok.substr(0, 2) == 'fn') {
          functions[tok] = {};
          Next();
          vars = {};
          Skip('(');
          if (tok != ')') {
            DimVariable(tname);
            while (tok == ',') {
              Skip(',');
              DimVariable(tname);
            }
          }
          Skip(')');
          Skip('=');
          var e = Expression();
          // TODO: Implement.
          vars = global_vars;
        } else {
          Throw('Expected seg');
        }
      } else if (tok == 'open') {
        Skip('open');
        var filename = Expression();
        Skip('for');
        if (tok == 'input') {
          Skip('input');
        } else if (tok == 'output') {
          Skip('output');
        } else {
          Throw('Expected input/output');
        }
        Skip('as');
        Next();
        // TODO: Implement.
      } else if (tok == 'close') {
        Skip('close');
        // #n
        Next();
        // TODO: Implement.
      } else if (tok == 'poke') {
        Skip('poke');
        var addr = Expression();
        Skip(',');
        var value = Expression();
        // TODO: Do something useful with it?
      } else if (tok == 'key') {
        Skip('key');
        if (tok == 'on') {
          Skip('on');
        } else if (tok == 'off') {
          Skip('off');
        } else {
          Throw('Expected on/off');
        }
        // Implement this?
      } else if (tok == 'sound') {
        Skip('sound');
        var freq = Expression();
        Skip(',');
        var duration = Expression();
        // TODO: Implement this.
      } else if (tok == 'play') {
        Skip('play');
        var notes = Expression();
        // TODO: Implement this.
      } else if (tok == 'draw') {
        Skip('draw');
        var cmds = Expression();
        curop += 'Draw(' + cmds + ');\n';
      } else if (tok == 'chain') {
        Skip('chain');
        var filename = Expression();
        if (tok == ',') {
          Skip(',');
          var name = tok;
          Next();
        }
        // TODO: Implement this.
      } else if (tok == 'option') {
        Skip('option');
        if (tok == 'explicit') {
          Skip('explicit');
          option_explicit = true;
        } else if (tok == 'base') {
          Skip('base');
          if (tok == '0') {
            option_base = 0;
          } if (tok == '1') {
            option_base = 1;
          } else {
            Throw('Unexpected option base "' + tok + '"');
          }
          Next();
        } else {
          Throw('Unexpected option "' + tok + '"');
        }
      } else if (tok == 'defdbl' || tok == 'defsng' || tok == 'deflng' ||
                 tok == 'defint' || tok == 'defstr') {
        var def_type = tok;
        Next();
        for (;;) {
          var start = tok;
          Next();
          Skip('-');
          var end = tok;
          Next();
          if (!start.match(/^[a-z]$/) ||
              !end.match(/^[a-z]$/) ||
              start.charCodeAt(0) > end.charCodeAt(0)) {
            Throw('Invalid variable range');
          }
          var i = start;
          do {
            letter_default[i] = DEFAULT_TYPES[def_type];
            i = NextChar(i);
          } while (i != end);
          if (tok == ',') {
            Skip(',');
            continue;
          }
          break;
        }
      } else if (tok == 'for') {
        Skip('for');
        var name = tok;
        var v = vars[name];
        if (v === undefined) {
          if (option_explicit) {
            Throw('Undeclared variable ' + name);
          } else {
            v = ImplicitDimVariable(name);
          }
        }
        Next();
        Skip('=');
        var start = Expression();
        Skip('to');
        var end = Expression();
        var step = 1;
        if (tok == 'step') {
          Skip('step');
          step = Expression();
        }
        curop += v.code + ' = (' + start + ');';
        NewOp();
        curop += 'if (((' + step + ' > 0) && ' +
                      v.code + ' > (' + end + ')) || ' +
                     '((' + step + ' < 0) && ' +
                      v.code + ' < (' + end + '))) { ip = ';
        NewOp();
        flow.push(['for', v.code, ops.length - 1, step]);
      } else if (tok == 'next') {
        Skip('next');
        var f = flow.pop();
        if (f[0] != 'for') {
          Throw('Expected NEXT');
        }
        if (tok != ':' && tok != '<EOL>') {
          var name = tok;
          // TODO: Shouldn't this fail?
          /*
          if (name != f[1]) {
            Throw('Expected ' + f[1]);
          }
          */
          Next();
        }
        curop += f[1] + ' += (' + f[3] + ');\n';
        curop += 'ip = ' + f[2] + ';\n';
        NewOp();
        ops[f[2]] += ops.length + '; }\n';
      } else if (tok == 'paint') {
        Skip('paint');
        Skip('(');
        var x = Expression();
        Skip(',');
        var y = Expression();
        Skip(')');
        var paint;
        if (tok == ',') {
          Skip(',');
          paint = Expression();
        }
        var border;
        if (tok == ',') {
          Skip(',');
          border = Expression();
        }
        curop += 'Paint((' + x + '), (' + y + '), (' +
          paint + '), (' + border + '));\n';
      } else if (tok == 'circle') {
        Skip('circle');
        Skip('(');
        var x = Expression();
        Skip(',');
        var y = Expression();
        Skip(')');
        Skip(',');
        var r = Expression();
        Skip(',');
        var c = Expression();
        var start = 0;
        var end = Math.PI * 2;
        var aspect = 1;
        var fill = 0;
        if (tok == ',') {
          Skip(',');
          if (tok != ',' && tok != '<EOL>') {
            start = Expression();
          }
        }
        if (tok == ',') {
          Skip(',');
          if (tok != ',' && tok != '<EOL>') {
            end = Expression();
          }
        }
        if (tok == ',') {
          Skip(',');
          if (tok != ',' && tok != '<EOL>') {
            aspect = Expression();
          }
        }
        if (tok == ',') {
          Skip(',');
          if (tok == 'f') {
            fill = 1;
            Next();
          } else {
            Throw('Expected F got ' + tok);
          }
        }
        curop += 'Circle((' +
          [x, y, r, c, start, end, aspect, fill].join('), (') + '));\n';
      } else if (tok == 'pset' || tok == 'preset') {
        Next();
        Skip('(');
        var x = Expression();
        Skip(',');
        var y = Expression();
        Skip(')');
        var extra = [];
        if (tok == ',') {
          Skip(',');
          extra.push(Expression());
          while (tok == ',') {
            Skip(',');
            if (tok != ',' && tok != '<EOL>') {
              extra.push(Expression());
            }
          }
        }
        curop += 'Pset((' +
          [x, y].concat(extra).join('), (') + '));\n';
      } else if (tok == 'line') {
        Skip('line');
        Skip('(');
        var x1 = Expression();
        Skip(',');
        var y1 = Expression();
        Skip(')');
        Skip('-');
        Skip('(');
        var x2 = Expression();
        Skip(',');
        var y2 = Expression();
        Skip(')');
        var c = 'undefined';
        var fill = 0;
        if (tok == ',') {
          Skip(',');
          if (tok != ',') {
            c = Expression();
          }
          if (tok == ',') {
            Skip(',');
            if (tok == 'b') {
              fill = 1;
            } else if (tok == 'bf') {
              fill = 2;
            } else {
              Throw('Unexpected ' + tok);
            }
            Next();
          }
        }
        curop += 'Line((' +
          [x1, y1, x2, y2, c, fill].join('), (') + '));\n';
      } else if (tok == 'get') {
        Skip('get');
        Skip('(');
        var x1 = Expression();
        Skip(',');
        var y1 = Expression();
        Skip(')');
        Skip('-');
        Skip('(');
        var x2 = Expression();
        Skip(',');
        var y2 = Expression();
        Skip(')');
        Skip(',');
        var name = tok;
        Next();
        var v = ImplicitDimGetPut(name);
        curop += 'GetImage(' + x1 + ', ' + y1 + ', ' +
          x2 + ', ' +  y2 + ', ' + v + ');\n';
      } else if (tok == 'put') {
        Skip('put');
        Skip('(');
        var x = Expression();
        Skip(',');
        var y = Expression();
        Skip(')');
        Skip(',');
        var name = tok;
        Next();
        var v = ImplicitDimGetPut(name);
        var mode = 'xor';
        if (tok == ',') {
          Skip(',');
          if (tok == 'pset' || tok == 'preset' || tok == 'and' ||
              tok == 'or' || tok == 'xor') {
            mode = tok;
            Next();
          } else {
            Throw('Invalid put mode');
          }
        }
        curop += 'PutImage(' + x + ', ' + y + ', ' +
          v + ', "' + mode + '");\n';
      } else if (tok == 'screen') {
        Skip('screen');
        var ret = 'Screen(';
        var e = Expression();
        ret += '(' + e + ')';
        while (tok == ',') {
          Skip(',');
          if (tok != ',' && tok != '<EOL>') {
            var e = Expression();
            ret += ', (' + e + ')';
          } else {
            ret += ', null';
          }
        }
        ret += ');\n'
        curop += ret;
      } else if (tok == 'cls') {
        Skip('cls');
        curop += 'Cls();\n';
      } else if (tok == 'sleep') {
        Skip('sleep');
        var e = Expression();
        curop += 'Sleep(' + e + ');\n';
        NewOp();
      } else if (tok == 'locate') {
        Skip('locate');
        var y = Expression();
        Skip(',');
        var x = Expression();
        if (tok == ',') {
          Skip(',');
          var cursor = Expression();
          // TODO: Support cursor + start + stop
        }
        curop += 'Locate(' + x + ', ' + y + ');\n';
      } else if (tok == 'width') {
        Skip('width');
        var w = Expression();
        curop += 'Width(' + w + ');\n';
      } else if (tok == 'color') {
        Skip('color');
        var fg = Expression();
        var bg = 0;
        if (tok == ',') {
          Skip(',');
          bg = Expression();
        }
        if (tok == ',') {
          Skip(',');
          var cursor = Expression();
          // TODO: Support cursor
        }
        curop += 'Color(' + fg + ',' + bg + ');\n';
      } else if (tok == 'palette') {
        Skip('palette');
        var c = Expression();
        Skip(',');
        var p = Expression();
        // TODO: Implement.
      } else if (tok == 'swap') {
        Skip('swap');
        var a = tok;
        Next();
        var va = vars[a];
        if (va == undefined) {
          Throw('Expected variable name');
        }
        Skip(',');
        var b = tok;
        Next();
        var vb = vars[b];
        if (vb == undefined) {
          Throw('Expected variable name');
        }
        curop += 'var t = ' + va[0] + ';\n';
        curop += va[0] + ' = ' + vb[0] + ';\n';
        curop += vb[0] + ' = ' + va[0] + ';\n';
      } else if (tok == 'data') {
        ConsumeData();
      } else if (tok == 'read') {
        Skip('read');
        var v = GetVar();
        curop += v.code + ' = data[data_pos++];\n';
        while (tok == ',') {
          Skip(',');
          var v = GetVar();
          curop += v.code + ' = data[data_pos++];\n';
        }
      } else if (tok == 'restore') {
        Skip('restore');
        if (tok != ':' && tok != '<EOL>') {
          curop += 'data_pos = data_labels["' + tok + '"];\n';
          Next();
        } else {
          curop += 'data_pos = 0;\n';
        }
      } else if (tok == 'input') {
        Skip('input');
        if (tok[0] == '#') {
          // TODO: Implement.
          Next();
          Skip(',');
        }
        while (tok != '<EOL>' && tok != ':') {
          var name = tok;
          Next();
          var v = IndexVariable(name);
          if (tok != ',') {
            break;
          }
          Skip(',');
        }
      } else if (tok == 'print') {
        Skip('print');
        if (tok == '<EOL>' || tok == ':') {
          curop += 'Print([]);\n';
          return;
        }
        var fmt = null;
        if (tok == 'using') {
          Skip('using');
          fmt = Expression();
          Skip(';');
        }
        var items = [];
        var e = Expression();
        items.push(e);
        while (tok == ';' || tok == ',') {
          items.push('"' + tok + '"');
          Next();
          if (tok == '<EOL>' || tok == ':') {
            break;
          }
          var e = Expression();
          items.push(e);
        }
        if (fmt !== null) {
          curop += 'PrintUsing(' + fmt + ', [' + items.join(', ') + ']);\n';
        } else {
          curop += 'Print([' + items.join(', ') + ']);\n';
        }
      } else if (tok == 'select') {
        Skip('select');
        Skip('case');
        if (tok == 'as') {
          Skip('as');
          Skip('const');
        }
        var e = Expression();
        NewOp();
        flow.push(['select', e, ops.length - 1, [], [], null]);
      } else if (tok == 'case') {
        Skip('case');
        var f = flow.pop();
        if (f[0] != 'select') {
          Throw('Case outside select');
        }
        NewOp();
        f[4].push(ops.length - 1);
        if (tok == 'else') {
          Skip('else');
          f[5] = ops.length;
          flow.push(f);
          return;
        }
        var e = Expression();
        if (tok == 'to') {
          Skip('to');
          var e1 = Expression();
          f[3].push([e, e1, ops.length]);
        } else {
          f[3].push([e, e, ops.length]);
          while (tok == ',') {
            Skip(',');
            var e = Expression();
            f[3].push([e, e, ops.length]);
          }
        }
        flow.push(f);
      } else if (tok == 'getmouse') {
        Skip('getmouse');
        curop += 'Yield();';
        NewOp();
        var v = GetVar();
        curop += v.code + ' = mouse_x;\n';
        Skip(',');
        var v = GetVar();
        curop += v.code + ' = mouse_y;\n';
        if (tok == ',') {
          Skip(',');
          if (tok != ',') {
            var v = GetVar();
            curop += v.code + ' = mouse_wheel;\n';
          }
        }
        if (tok == ',') {
          Skip(',');
          if (tok != ',') {
            var v = GetVar();
            curop += v.code + ' = mouse_buttons;\n';
          }
        }
        if (tok == ',') {
          Skip(',');
          var v = GetVar();
          curop += v.code + ' = mouse_clip;\n';
        }
      } else if (tok == '') {
        return;
      } else if (subroutines[tok] !== undefined) {
        var sub = subroutines[tok];
        Next();
        while (tok != '<EOL>' && tok != ':') {
          var e = Expression();
          if (tok != ',') {
            break;
          }
          Skip(',');
        }
      } else {
        var name = tok;
        Next();
        if (tok == ':') {
          Skip(':');
          AddLabel(name);
          return;
        }
        var vname = IndexVariable(name);
        if (tok == '=' || tok == '+=' || tok == '-=' ||
            tok == '*=' || tok == '/=' || tok == '\\=' ||
            tok == '^=' || tok == '&=') {
          var op = tok;
          Next();
          var e = Expression();
          if (op == '&='){
            op = '+=';
          } else if (op == '\\=') {
            op = '//=';
          } else if (op == '^=') {
            curop += vname + ' = Math.pow(' + vname + ', ' + e + ');\n';
            return;
          }
          curop += vname + ' ' + op + ' (' + e + ');\n';
        } else {
          Throw('Expected "=" or "x=" found "' + tok + '"');
        }
      }
    }

    function Compile() {
      NewOp();
      while (tok != '') {
        for (;;) {
          // Implement line numbers.
          if (tok.match(/^[0-9]+$/)) {
            AddLabel(tok);
            Next();
          }
          Statement();
          while (tok == ':') {
            Next();
            Statement();
          }
          if (tok == '') {
            break;
          }
          Skip('<EOL>');
        }
      }

      // Check for matching flow control.
      if (flow.length != 0) {
        var f = flow.pop();
        Throw('Unmatched ' + f[0]);
      }

      // Implicit End.
      NewOp();
      curop += 'End();';
      NewOp();

      // Round allocated up.
      allocated = Math.floor((allocated + 7) / 8) * 8;

      var total = '';
      total += 'var buffer = new ArrayBuffer(' + allocated + ');\n';
      total += 'var b = new Uint8Array(buffer);\n';
      total += 'var i16 = new Int16Array(buffer);\n';
      total += 'var i = new Int32Array(buffer);\n';
      total += 'var s = new Float32Array(buffer);\n';
      total += 'var d = new Float64Array(buffer);\n';
      total += 'var str = new Array(' + str_count + ');\n';
      total += var_decls;
      total += 'for (var j = 0; j < ops.length; ++j) {\n';
      if (debugging_mode) {
        total += '  console.info("L" + j + ":\\n" + ops[j]);\n';
      }
      total += '  ops[j] = eval("(function() {\\n" + ops[j] + "})\\n");\n';
      total += '}\n';
      if (debugging_mode) {
        console.info(total);
      }
      eval(total);
    }

    var viewport_x, viewport_y;
    var viewport_w, viewport_h;

    function Resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      var raspect = canvas.width / canvas.height;
      var aspect = display.width / (display.height * screen_aspect);
      if (raspect > aspect) {
        viewport_w = Math.floor(
          display.width * canvas.height / (display.height * screen_aspect));
        viewport_h = canvas.height;
        viewport_x = Math.floor((canvas.width - viewport_w) / 2);
        viewport_y = 0;
      } else {
        viewport_w = canvas.width;
        viewport_h = Math.floor(
          (display.height * screen_aspect) * canvas.width / display.width);
        viewport_x = 0;
        viewport_y = Math.floor((canvas.height - viewport_h) / 2);
      }
    }

    function Render() {
      if (!canvas) {
        return;
      }
      var scale_ctx = scale_canvas.getContext('2d');
      scale_ctx.fillStyle = '#000';
      scale_ctx.fillRect(0, 0, scale_canvas.width, scale_canvas.height);
      scale_ctx.putImageData(display, 0, 0);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
//      ctx.imageSmoothingQuality = 'low';
//      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(scale_canvas, viewport_x, viewport_y,
        viewport_w, viewport_h);
      requestAnimationFrame(Render);
    }

    function InitEvents() {
      if (!canvas) {
        return;
      }
      Resize();
      window.addEventListener('resize', Resize, false);
      window.addEventListener('keydown', function(e) {
        var k = e.key;
        if (k == 'Escape') { k = String.fromCharCode(27); }
        keys.push(k);
      }, false);
      canvas.addEventListener('mousemove', function(e) {
        // TODO: Generalize for non-fullscreen.
        //var rect = canvas.getBoundingClientRect();
        var rect = {left: 0, top: 0};
        mouse_x = Math.floor(
          (e.clientX - rect.left - viewport_x) * display.width / viewport_w);
        mouse_y = Math.floor(
          (e.clientY - rect.top - viewport_y) * display.height / viewport_h);
      }, false);
      canvas.addEventListener('mousedown', function(e) {
        mouse_buttons = 1;
      }, false);
      canvas.addEventListener('mouseup', function(e) {
        mouse_buttons = 0;
      }, false);
      // TODO: Implement Mouse Wheel!
      // TODO: Implement Mouse Clip!
    }

    function Run() {
      var speed = 100000;
      for (;;) {
        if (screen_mode > 0 && screen_mode <= 2) {
          speed = 1;
        } else {
          speed = 100000;
        }
        for (var i = 0; i < speed; ++i) {
          ops[ip++]();
          if (yielding) {
            yielding = 0;
            if (quitting) {
              return;
            }
            break;
          }
        }
        if (canvas) {
          setTimeout(Run, delay);
          delay = 0;
          break;
        }
      }
    }

    var compiled_ok = false;
    try {
      Compile();
      compiled_ok = true;
    } catch (e) {
      if (canvas) {
        Locate(1, 1);
        Color(WHITE);
        Print([e.toString(), ';']);
      } else {
        console.error(e.toString());
      }
      console.info(e.stack);
    }
    InitEvents();
    Render();
    if (compiled_ok) {
      Run();
    }
  }

  function SetupCanvas(tag, full_window) {
    if (full_window) {
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.margin = '0';
      document.body.style.border = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.display = 'block';
    }
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    if (full_window) {
      document.body.appendChild(canvas);
    } else {
      tag.insertAdjacentElement('beforebegin', canvas);
    }
    var context = canvas.getContext('2d');
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.strokeStyle = 'white';
    return canvas;
  }

  var timer_halted = 0;
  var timer_offset = 0;

  function GetTimer() {
    var t = new Date().getTime() / 1000;
    return t + timer_offset;
  }

  function Init() {
    var tags = document.getElementsByTagName('script');
    var count = 0;
    for (var t = 0; t < tags.length; ++t) {
      if (tags[t].type != 'text/basic') {
        continue;
      }
      ++count;
    }
    var full_window = count == 1 && document.body.innerText == '';
    for (var t = 0; t < tags.length; ++t) {
      if (tags[t].type != 'text/basic') {
        continue;
      }
      var tag = tags[t];
      var canvas = SetupCanvas(tag, full_window);
      if (tags[t].src) {
        var request = new XMLHttpRequest();
        request.addEventListener("load", function(e) {
          Interpret(request.responseText, canvas);
        }, false);
        request.open("GET", tag.src);
        request.send();
      } else {
        Interpret(tag.text, canvas);
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('load', Init);
    window.addEventListener('focusout', function() {
      timer_halted = GetTimer();
    });
    window.addEventListener('focusin', function() {
      timer_offset = timer_halted - (new Date().getTime() / 1000);
    });
  } else {
    exports.Basic = function(code) {
      Interpret(code, null);
    };
  }
})();

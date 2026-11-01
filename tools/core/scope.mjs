// Статический анализ областей видимости для оригинальной сборки.
// Нужен генератору производного core: находит свободные идентификаторы
// (то, что сборка берёт из глобального окружения браузера) и объявления
// верхнего уровня. Анализ выполняется в семантике strict mode, потому что
// производный core исполняется внутри ES-модуля.
import * as acorn from 'acorn';

class Scope {
  constructor(parent, kind) {
    this.parent = parent;
    this.kind = kind; // 'program' | 'function' | 'block' | 'name'
    this.names = new Map(); // имя → вид объявления
  }
  declare(name, kind) {
    if (!this.names.has(name)) this.names.set(name, kind);
  }
  resolve(name) {
    for (let s = this; s; s = s.parent) if (s.names.has(name)) return s;
    return null;
  }
  functionScope() {
    let s = this;
    while (s.kind !== 'function' && s.kind !== 'program') s = s.parent;
    return s;
  }
}

function patternNames(node, out = []) {
  if (!node) return out;
  switch (node.type) {
    case 'Identifier': out.push(node.name); break;
    case 'ObjectPattern':
      for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
      break;
    case 'ArrayPattern': for (const e of node.elements) patternNames(e, out); break;
    case 'RestElement': patternNames(node.argument, out); break;
    case 'AssignmentPattern': patternNames(node.left, out); break;
    default: break; // MemberExpression в деструктурирующем присваивании — не объявление
  }
  return out;
}

// var-объявления тела функции, не заходя во вложенные функции.
function hoistVars(node, scope) {
  if (!node || typeof node.type !== 'string') return;
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
      return;
    case 'VariableDeclaration':
      if (node.kind === 'var') for (const d of node.declarations) for (const n of patternNames(d.id)) scope.declare(n, 'var');
      for (const d of node.declarations) hoistVars(d.init, scope);
      return;
    default:
      for (const key of Object.keys(node)) {
        if (key === 'type' || key === 'start' || key === 'end') continue;
        const v = node[key];
        if (Array.isArray(v)) v.forEach(c => hoistVars(c, scope));
        else if (v && typeof v.type === 'string') hoistVars(v, scope);
      }
  }
}

function hoistLexical(statements, scope, blockFunctions) {
  for (const st of statements) {
    if (st.type === 'VariableDeclaration' && st.kind !== 'var') {
      for (const d of st.declarations) for (const n of patternNames(d.id)) scope.declare(n, st.kind);
    } else if (st.type === 'ClassDeclaration') {
      scope.declare(st.id.name, 'class');
    } else if (st.type === 'FunctionDeclaration') {
      scope.declare(st.id.name, 'function');
      if (scope.kind === 'block') blockFunctions.push({ name: st.id.name, start: st.start });
    }
  }
}

export function analyze(code) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  let strictSyntax = true;
  let strictSyntaxError = null;
  try {
    acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
  } catch (error) {
    strictSyntax = false;
    strictSyntaxError = String(error.message);
  }

  const free = new Map(); // имя → { reads, writes, typeofOnly }
  const blockFunctions = [];
  const topLevelThis = [];
  const program = new Scope(null, 'program');

  const ref = (name, scope, mode) => {
    if (scope.resolve(name)) return;
    let entry = free.get(name);
    if (!entry) free.set(name, (entry = { reads: 0, writes: 0, typeofReads: 0 }));
    if (mode === 'write') entry.writes++;
    else if (mode === 'typeof') entry.typeofReads++;
    else entry.reads++;
  };

  // Ссылки внутри шаблона присваивания (деструктуризация без объявления).
  const assignTarget = (node, scope, fnDepth) => {
    if (!node) return;
    switch (node.type) {
      case 'Identifier': ref(node.name, scope, 'write'); break;
      case 'ObjectPattern':
        for (const p of node.properties) {
          if (p.type === 'RestElement') assignTarget(p.argument, scope, fnDepth);
          else {
            if (p.computed) visit(p.key, scope, fnDepth);
            assignTarget(p.value, scope, fnDepth);
          }
        }
        break;
      case 'ArrayPattern': for (const e of node.elements) assignTarget(e, scope, fnDepth); break;
      case 'RestElement': assignTarget(node.argument, scope, fnDepth); break;
      case 'AssignmentPattern': assignTarget(node.left, scope, fnDepth); visit(node.right, scope, fnDepth); break;
      default: visit(node, scope, fnDepth);
    }
  };

  // Выражения внутри объявляющего шаблона: значения по умолчанию и вычисляемые ключи.
  const bindingExprs = (node, scope, fnDepth) => {
    if (!node) return;
    switch (node.type) {
      case 'ObjectPattern':
        for (const p of node.properties) {
          if (p.type === 'RestElement') bindingExprs(p.argument, scope, fnDepth);
          else {
            if (p.computed) visit(p.key, scope, fnDepth);
            bindingExprs(p.value, scope, fnDepth);
          }
        }
        break;
      case 'ArrayPattern': for (const e of node.elements) bindingExprs(e, scope, fnDepth); break;
      case 'RestElement': bindingExprs(node.argument, scope, fnDepth); break;
      case 'AssignmentPattern': bindingExprs(node.left, scope, fnDepth); visit(node.right, scope, fnDepth); break;
      default: break;
    }
  };

  const visitFunction = (node, scope, fnDepth) => {
    let outer = scope;
    if (node.type === 'FunctionExpression' && node.id) {
      outer = new Scope(scope, 'name');
      outer.declare(node.id.name, 'function-name');
    }
    const fn = new Scope(outer, 'function');
    if (node.type !== 'ArrowFunctionExpression') fn.declare('arguments', 'arguments');
    for (const p of node.params) for (const n of patternNames(p)) fn.declare(n, 'param');
    for (const p of node.params) bindingExprs(p, fn, fnDepth + 1);
    const depth = node.type === 'ArrowFunctionExpression' ? fnDepth : fnDepth + 1;
    if (node.body.type === 'BlockStatement') {
      hoistVars(node.body, fn);
      hoistLexical(node.body.body, fn, blockFunctions);
      for (const st of node.body.body) visit(st, fn, depth);
    } else {
      visit(node.body, fn, depth);
    }
  };

  const visitClass = (node, scope, fnDepth) => {
    let inner = scope;
    if (node.id) {
      inner = new Scope(scope, 'name');
      inner.declare(node.id.name, 'class-name');
    }
    if (node.superClass) visit(node.superClass, inner, fnDepth);
    for (const m of node.body.body) {
      if (m.type === 'StaticBlock') {
        const b = new Scope(inner, 'function');
        hoistVars({ type: 'BlockStatement', body: m.body }, b);
        hoistLexical(m.body, b, blockFunctions);
        for (const st of m.body) visit(st, b, fnDepth + 1);
        continue;
      }
      if (m.computed) visit(m.key, inner, fnDepth);
      if (m.value) {
        if (m.type === 'MethodDefinition') visitFunction(m.value, inner, fnDepth);
        else visit(m.value, inner, fnDepth + 1);
      }
    }
  };

  const visitBlock = (statements, scope, fnDepth) => {
    const block = new Scope(scope, 'block');
    hoistLexical(statements, block, blockFunctions);
    for (const st of statements) visit(st, block, fnDepth);
  };

  function visit(node, scope, fnDepth) {
    if (!node) return;
    switch (node.type) {
      case 'Identifier': ref(node.name, scope, 'read'); return;
      case 'ThisExpression': if (fnDepth === 0) topLevelThis.push(node.start); return;
      case 'MemberExpression':
        visit(node.object, scope, fnDepth);
        if (node.computed) visit(node.property, scope, fnDepth);
        return;
      case 'ChainExpression': visit(node.expression, scope, fnDepth); return;
      case 'Property':
        if (node.computed) visit(node.key, scope, fnDepth);
        visit(node.value, scope, fnDepth);
        return;
      case 'UnaryExpression':
        if (node.operator === 'typeof' && node.argument.type === 'Identifier') ref(node.argument.name, scope, 'typeof');
        else visit(node.argument, scope, fnDepth);
        return;
      case 'UpdateExpression':
        if (node.argument.type === 'Identifier') ref(node.argument.name, scope, 'write');
        else visit(node.argument, scope, fnDepth);
        return;
      case 'AssignmentExpression':
        assignTarget(node.left, scope, fnDepth);
        visit(node.right, scope, fnDepth);
        return;
      case 'VariableDeclaration':
        for (const d of node.declarations) {
          bindingExprs(d.id, scope, fnDepth);
          visit(d.init, scope, fnDepth);
        }
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        visitFunction(node, scope, fnDepth);
        return;
      case 'ClassDeclaration':
      case 'ClassExpression':
        visitClass(node, scope, fnDepth);
        return;
      case 'BlockStatement': visitBlock(node.body, scope, fnDepth); return;
      case 'StaticBlock': visitBlock(node.body, scope, fnDepth); return;
      case 'SwitchStatement': {
        visit(node.discriminant, scope, fnDepth);
        const block = new Scope(scope, 'block');
        const all = node.cases.flatMap(c => c.consequent);
        hoistLexical(all, block, blockFunctions);
        for (const c of node.cases) {
          visit(c.test, block, fnDepth);
          for (const st of c.consequent) visit(st, block, fnDepth);
        }
        return;
      }
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement': {
        const loop = new Scope(scope, 'block');
        const init = node.type === 'ForStatement' ? node.init : node.left;
        if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') {
          for (const d of init.declarations) for (const n of patternNames(d.id)) loop.declare(n, init.kind);
        }
        if (node.type === 'ForStatement') {
          visit(node.init, loop, fnDepth);
          visit(node.test, loop, fnDepth);
          visit(node.update, loop, fnDepth);
        } else {
          if (node.left.type === 'VariableDeclaration') visit(node.left, loop, fnDepth);
          else assignTarget(node.left, loop, fnDepth);
          visit(node.right, loop, fnDepth);
        }
        visit(node.body, loop, fnDepth);
        return;
      }
      case 'CatchClause': {
        const c = new Scope(scope, 'block');
        if (node.param) {
          for (const n of patternNames(node.param)) c.declare(n, 'catch');
          bindingExprs(node.param, c, fnDepth);
        }
        visitBlock(node.body.body, c, fnDepth);
        return;
      }
      case 'LabeledStatement': visit(node.body, scope, fnDepth); return;
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'MetaProperty':
      case 'Literal':
      case 'EmptyStatement':
      case 'DebuggerStatement':
        return;
      case 'WithStatement': throw new Error('with недопустим в производном core');
      default:
        for (const key of Object.keys(node)) {
          if (key === 'type' || key === 'start' || key === 'end') continue;
          const v = node[key];
          if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && visit(c, scope, fnDepth));
          else if (v && typeof v.type === 'string') visit(v, scope, fnDepth);
        }
    }
  }

  hoistVars(ast, program);
  hoistLexical(ast.body, program, blockFunctions);
  for (const st of ast.body) visit(st, program, 0);

  return {
    strictSyntax,
    strictSyntaxError,
    free,
    topLevel: program.names,
    blockFunctions,
    topLevelThis,
    lastStatement: ast.body[ast.body.length - 1],
    ast,
  };
}

export const Logger = {
  trace(...data: any) {
    log('verbose', data);
  },
  info(...data: any) {
    log('info', data);
  },
  action(...data: any) {
    log('action', data);
  },
  warning(...data: any) {
    log('warning', data);
  },
  error(...data: any) {
    log('error', data);
  },
  format(...data: any): string {
    return format(data);
  },
  String: 'logString',
  Props: 'logProps',
};

export interface Logger {
  trace(...data: any): void;
  info(...data: any): void;
  action(...data: any): void;
  warning(...data: any): void;
  error(...data: any): void;
}

export function createLogger(name: string): Logger {
  const prefix = name + ':';
  return {
    trace(...data: any) {
      log('verbose', [prefix, ...data]);
    },
    info(...data: any) {
      log('info', [prefix, ...data]);
    },
    action(...data: any) {
      log('action', [prefix, ...data]);
    },
    warning(...data: any) {
      log('warning', [prefix, ...data]);
    },
    error(...data: any) {
      log('error', [prefix, ...data]);
    },
  };
}

type LogLevel = Parameters<typeof minetest.log>[0];
const log = (level: LogLevel, data: any[]) =>
  minetest.log(level, '[MiniForts] ' + format(data));

function format(data: any[]): string {
  return data.map((item) => formatSingle(item)).join(' ');
}

function formatSingle(
  data: any,
  memory: WeakSet<object> = new WeakSet()
): string {
  if (data == null || typeof data === 'undefined') {
    return '(nil)';
  }

  if (['string', 'number', 'boolean', 'function'].includes(typeof data)) {
    return data.toString();
  }

  if (Array.isArray(data)) {
    return `[${data.map((item) => formatValue(item, memory)).join(', ')}]`;
  }

  if (typeof data === 'object') {
    if (typeof data[Logger.String] === 'function') {
      return data[Logger.String](data);
    }

    if (typeof data.to_string === 'function') {
      return data.to_string();
    }
    if (typeof data.to_table === 'function') {
      return formatObject(data.to_table(), memory);
    }

    if (data instanceof Set) {
      return data.size > 0
        ? `Set(size=${data.size} values=${formatSingle([...data], memory)})`
        : 'Set(size=0)';
    }
    if (data instanceof Map) {
      if (data.size === 0) return 'Map(size=0)';
      const valuesString = [...data.entries()]
        .map(
          ([key, value]) =>
            formatValue(key, memory) + '→' + formatValue(value, memory)
        )
        .join(', ');
      return `Map(size=${data.size} values={${valuesString}})`;
    }

    const propertyNames = Object.keys(data);
    if (equalSet(propertyNames, ['x', 'y'])) {
      return `(${data.x},${data.y})`;
    } else if (equalSet(propertyNames, ['x', 'y', 'z'])) {
      return `(${data.x},${data.y},${data.z})`;
    }

    // is class instance
    if ('constructor' in data && typeof data.constructor.name === 'string') {
      // TSTL-specific '__tostring'
      if (typeof data.constructor.prototype.__tostring === 'function') {
        return data.toString();
      }

      let props = data[Logger.Props];
      if (typeof props === 'function') {
        props = data[Logger.Props](data);
      }
      if (Array.isArray(props)) {
        return props.reduce((acc, k) => (acc[k] = data[k]), {});
      }

      const propsStr = props
        ? Object.entries(props)
            .map(
              ([key, value]) =>
                `${formatSingle(key, memory)}=${formatValue(value, memory)}`
            )
            .join(' ')
        : '';

      return `${data.constructor.name}(${propsStr})`;
    }

    if (data instanceof Object) {
      return formatObject(data, memory);
    }
  }

  return data.toString();
}

function formatValue(value: any, memory: WeakSet<object>): string {
  if (typeof value === 'string') {
    return `'${value}'`;
  }

  return formatSingle(value, memory);
}

function formatObject(object: object, memory: WeakSet<object>): string {
  if (memory.has(object)) return '{…}';

  memory.add(object);

  return (
    '{' +
    Object.entries(object)
      .map(
        ([key, value]) =>
          `${formatValue(key, memory)}:${formatValue(value, memory)}`
      )
      .join(',') +
    '}'
  );
}

function equalSet<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (const x of a) {
    if (!b.includes(x)) return false;
  }
  return true;
}

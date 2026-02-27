/**
 * @module domains/data-framework
 * @description Domain knowledge for Data Processing framework generation.
 */

const DATA_FRAMEWORK_DOMAIN = {
  id: 'data',
  name: 'Data Processing Framework',
  description: 'Frameworks for ETL pipelines, data transformation, stream processing, and data validation',

  coreConcepts: [
    'pipeline',
    'transform',
    'extract',
    'load',
    'stream-processing',
    'batch-processing',
    'data-validation',
    'schema-definition',
    'serialization',
    'partitioning',
    'error-recovery',
    'backpressure',
  ],

  architecturalStyles: {
    etl: {
      name: 'ETL Pipeline',
      description: 'Extract → Transform → Load sequential pipeline',
      patterns: ['source-connector', 'transformer', 'sink-connector', 'pipeline-builder'],
    },
    streaming: {
      name: 'Stream Processing',
      description: 'Real-time data processing with streams (Kafka-like)',
      patterns: ['producer', 'consumer', 'stream-operator', 'window-function'],
    },
    batch: {
      name: 'Batch Processing',
      description: 'Large-scale batch data processing (Spark-like)',
      patterns: ['job-scheduler', 'partition', 'map-reduce', 'aggregator'],
    },
    validation: {
      name: 'Data Validation',
      description: 'Schema validation and data quality framework (Zod-like)',
      patterns: ['schema-builder', 'validator', 'transformer', 'error-formatter'],
    },
  },

  directoryStructure: {
    src: {
      pipeline: 'Pipeline engine — compose, execute, monitor pipelines',
      connectors: 'Source and sink connectors — file, database, API, stream',
      transforms: 'Data transformation functions — map, filter, aggregate, join',
      validators: 'Data validation — schemas, rules, type-checking',
      serializers: 'Serialization — JSON, CSV, Parquet, Avro adapters',
      scheduler: 'Job scheduling — cron, event-triggered, dependency-based',
      monitoring: 'Pipeline monitoring — metrics, logging, alerts',
      utils: 'Utility functions',
      'index.js': 'Public API',
    },
  },

  requiredModules: [
    {
      name: 'Pipeline Builder',
      responsibility: 'Compose data processing pipelines from stages',
      interface: {
        methods: ['from(source)', 'pipe(transform)', 'to(sink)', 'build()', 'run()', 'validate()'],
      },
    },
    {
      name: 'Transform Library',
      responsibility: 'Built-in data transformation functions',
      interface: {
        methods: ['map(fn)', 'filter(predicate)', 'reduce(fn, initial)', 'groupBy(key)', 'sort(comparator)', 'flatten()', 'unique(key)'],
      },
    },
    {
      name: 'Connector Interface',
      responsibility: 'Abstract source/sink connections for data I/O',
      interface: {
        methods: ['connect(config)', 'read(options)', 'write(data, options)', 'close()', 'getSchema()'],
      },
    },
    {
      name: 'Schema Validator',
      responsibility: 'Validate data against schemas with detailed error reporting',
      interface: {
        methods: ['define(schema)', 'validate(data)', 'coerce(data)', 'getErrors()', 'isValid(data)'],
      },
    },
  ],

  optionalModules: [
    { name: 'Stream Engine', triggers: ['stream', 'realtime', 'kafka', 'event-stream'], provides: ['readable/writable streams', 'backpressure', 'windowing'] },
    { name: 'Job Scheduler', triggers: ['schedule', 'cron', 'periodic', 'batch'], provides: ['cron scheduling', 'dependency DAG', 'retry logic'] },
    { name: 'Monitoring', triggers: ['monitor', 'metrics', 'alert', 'dashboard'], provides: ['pipeline metrics', 'alerting', 'health checks'] },
    { name: 'File Connectors', triggers: ['file', 'csv', 'json', 'parquet', 'excel'], provides: ['CSV reader/writer', 'JSON streaming', 'file watcher'] },
    { name: 'Database Connectors', triggers: ['database', 'sql', 'postgres', 'mongo'], provides: ['SQL connector', 'MongoDB connector', 'connection pooling'] },
  ],

  referenceFrameworks: [
    { name: 'Apache Beam', style: 'unified', strength: 'batch + stream unified' },
    { name: 'Node Streams', style: 'built-in', strength: 'native + composable' },
    { name: 'Zod', style: 'validation', strength: 'type-safe schemas' },
    { name: 'Luigi', style: 'batch-pipeline', strength: 'dependency management' },
    { name: 'dbt', style: 'sql-transform', strength: 'SQL-first transforms' },
  ],

  codePatterns: {
    pipeline: `
export class Pipeline {
  #stages = [];
  #source = null;
  #sink = null;

  from(source) { this.#source = source; return this; }
  pipe(transform) { this.#stages.push(transform); return this; }
  to(sink) { this.#sink = sink; return this; }

  async run() {
    let data = await this.#source.read();
    for (const stage of this.#stages) {
      data = await stage(data);
    }
    if (this.#sink) await this.#sink.write(data);
    return data;
  }
}`,
    transform: `
export const transforms = {
  map: (fn) => (data) => data.map(fn),
  filter: (predicate) => (data) => data.filter(predicate),
  groupBy: (key) => (data) => data.reduce((groups, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (groups[k] = groups[k] || []).push(item);
    return groups;
  }, {}),
  sort: (comparator) => (data) => [...data].sort(comparator),
  unique: (key) => (data) => {
    const seen = new Set();
    return data.filter(item => {
      const k = key ? item[key] : item;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
};`,
  },

  testingStrategies: {
    unit: ['Test each transform function', 'Test schema validation', 'Test connector read/write', 'Test pipeline composition'],
    integration: ['Test full pipeline execution', 'Test error recovery mid-pipeline', 'Test large dataset processing'],
  },
};

export default DATA_FRAMEWORK_DOMAIN;

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Configuração do banco baseada no seu .env
const connection = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'developer',
  password: '12345',
  database: 'apae-smart-eventos',
  multipleStatements: false // Mudando para false para executar uma por vez
});

// Ler e executar o schema.sql
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

console.log('🔄 Conectando ao banco de dados...');

connection.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    return;
  }
  
  console.log('✅ Conectado ao MySQL!');
  console.log('🔄 Lendo arquivo schema.sql...');
  
  // Ler o arquivo schema.sql
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Dividir as queries por ponto e vírgula
  const queries = schema
    .split(';')
    .map(query => query.trim())
    .filter(query => query.length > 0 && !query.startsWith('--'));
  
  console.log(`📝 Encontradas ${queries.length} queries para executar...\n`);
  
  // Executar cada query individualmente
  executeQueries(queries, 0);
});

function executeQueries(queries, index) {
  if (index >= queries.length) {
    console.log('\n✅ Todas as migrações foram executadas com sucesso!');
    connection.end();
    return;
  }
  
  const query = queries[index];
  console.log(`🔄 Executando query ${index + 1}/${queries.length}:`);
  console.log(`📝 ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
  
  connection.query(query, (error, results) => {
    if (error) {
      console.error(`❌ Erro na query ${index + 1}:`);
      console.error(`📝 Query completa:\n${query}`);
      console.error(`🔥 Erro: ${error.message}\n`);
      connection.end();
      return;
    }
    
    console.log(`✅ Query ${index + 1} executada com sucesso!\n`);
    
    // Executar próxima query
    executeQueries(queries, index + 1);
  });
}
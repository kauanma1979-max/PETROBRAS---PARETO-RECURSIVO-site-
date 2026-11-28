import test from 'node:test';
import assert from 'node:assert/strict';

// --- Mock Browser Globals BEFORE importing app modules ---
class MockStorage implements Storage {
  private store = new Map<string, string>();
  public failOnKey: string | null = null;
  public failError: Error = new Error('QuotaExceededError');

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failOnKey && key === this.failOnKey) {
      throw this.failError;
    }
    this.store.set(key, String(value));
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

const eventListeners = new Map<string, Set<(ev: any) => void>>();

class MockCustomEvent {
  public type: string;
  public detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
}

const mockWindow: any = {
  crypto: globalThis.crypto,
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
  location: { origin: 'https://transpetro-test.local' },
  addEventListener(type: string, cb: (ev: any) => void) {
    if (!eventListeners.has(type)) eventListeners.set(type, new Set());
    eventListeners.get(type)!.add(cb);
  },
  removeEventListener(type: string, cb: (ev: any) => void) {
    eventListeners.get(type)?.delete(cb);
  },
  dispatchEvent(ev: any) {
    const set = eventListeners.get(ev.type);
    if (set) {
      for (const cb of Array.from(set)) {
        cb(ev);
      }
    }
    return true;
  },
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;
(globalThis as any).window = mockWindow;
(globalThis as any).CustomEvent = MockCustomEvent;

// Now import modules cleanly
import {
  BACKUP_FILE_NAME,
  BACKUP_MODULES_REGISTRY,
  EXCLUDED_STORAGE_KEYS,
  STORAGE_KEYS,
} from '../src/utils/backupRegistry';
import {
  generateValidatedBackupAsync,
  generateCompleteBackupSync,
} from '../src/utils/backupSerializer';
import {
  applyBackupRestoreSync,
  applyInspectedBackupRestore,
  inspectBackupFromJsonString,
  inspectBackupObject,
  restorePreRestoreRollbackSnapshot,
} from '../src/utils/backupRestoreService';
import { getBackupStats } from '../src/utils/backupStorage';
import {
  getDriveFileId,
  getGoogleAppsScriptTemplate,
  GOOGLE_DRIVE_ACCOUNT_EMAIL,
  GOOGLE_DRIVE_BACKUP_FOLDER,
  mergeTranspetroBackupData,
  pushBackupToGoogleDrive,
  STORAGE_KEY_DRIVE_FILE_ID,
} from '../src/utils/driveSync';
import { saveBackupToDriveApi } from '../src/services/googleDriveApi';

function resetAllTestState() {
  mockLocalStorage.failOnKey = null;
  mockLocalStorage.clear();
  mockSessionStorage.clear();
  eventListeners.clear();
}

function seedFullAppData() {
  mockLocalStorage.setItem(
    STORAGE_KEYS.VERTICAL_SYLLABUS,
    JSON.stringify({
      'TP-01': {
        teoria: true,
        questoes: true,
        revisao: false,
        questoesFeitas: 45,
        questoesAcertos: 38,
        notas: 'Atenção à calibração HART e malha 4-20 mA.',
      },
      'TP-02': {
        teoria: true,
        questoes: false,
        revisao: false,
        questoesFeitas: 12,
        questoesAcertos: 9,
        notas: 'Revisar NPSH disponível vs requerido.',
      },
    })
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.ERROR_NOTEBOOK,
    JSON.stringify([
      {
        id: 'err-101',
        data: '27/11/2026',
        disciplina: 'Instrumentação e Controle de Processos',
        origem: 'transpetro',
        subtopico: 'Controlador PID — Ação Derivativa',
        enunciadoResumido: 'Efeito da ação derivativa na resposta transitória.',
        motivoErro: 'Confundi redução de overshoot com eliminação de offset.',
        regraCorreta: 'Integral zera offset; derivativa antecipa variação e reduz overshoot.',
        revisado: false,
      },
      {
        id: 'err-102',
        data: '27/11/2026',
        disciplina: 'Química, Refino, Combustíveis e Segurança',
        origem: 'ambos',
        subtopico: 'Equilíbrio Químico — Le Chatelier',
        enunciadoResumido: 'Deslocamento com aumento de pressão.',
        motivoErro: 'Esqueci de somar apenas mols gasosos.',
        regraCorreta: 'Maior pressão desloca para o lado de menor número de mols gasosos.',
        revisado: true,
      },
    ])
  );

  mockLocalStorage.setItem(STORAGE_KEYS.ERROR_NOTEBOOK_CUSTOMIZED, 'true');
  mockLocalStorage.setItem(
    STORAGE_KEYS.ERROR_NOTEBOOK_AREAS_CUSTOM,
    JSON.stringify({
      inst: { nomeCurto: 'Instrumentação Avançada', escopoInfo: 'Ênfase 4 + Malhas' },
    })
  );
  mockLocalStorage.setItem(
    STORAGE_KEYS.ERROR_NOTEBOOK_SIMULATOR,
    JSON.stringify({
      simInst: 82,
      simMec: 76,
      simQui: 88,
      simEle: 70,
      simGerais: 85,
    })
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.CUSTOM_MATERIALS,
    JSON.stringify({
      'sec-inst-1': {
        notes: 'Resumo detalhado com acentuação: pressão manométrica vs absoluta.',
        mindMaps: [
          {
            id: 'mm-1',
            title: 'Transmissores 4-20mA',
            dataUrl: 'data:image/png;base64,' + 'A'.repeat(2048),
            createdAt: '2026-11-27T10:00:00.000Z',
          },
        ],
      },
    })
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.MATERIAL_LINKS,
    JSON.stringify([
      {
        id: 'lnk-1',
        titulo: 'Prova Transpetro 2018 — Operação Jr',
        url: 'https://drive.google.com/file/d/example123/view',
        categoria: 'Provas',
        disciplina: 'Instrumentação',
      },
    ])
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.SCHEDULE_DAY_NOTES,
    JSON.stringify({
      '2027-01-12': 'Concluído bloco 1 e 2 com 85% de acertos.',
    })
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.FOCUS_LOGS,
    JSON.stringify([
      {
        id: 'log-1',
        dateKey: '2026-11-27',
        macroAreaId: 'instrumentacao',
        durationSeconds: 3000,
        startedAt: 1795800000000,
        endedAt: 1795803000000,
        topicTitle: 'Instrumentação',
        type: 'focus',
        status: 'completed',
      },
    ])
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.POMODORO_ACTIVE_STATE,
    JSON.stringify({
      sessionId: 'sess-1',
      dateKey: '2026-11-27',
      scheduleBlockId: 'blk-1',
      macroAreaId: 'instrumentacao',
      topicTitle: 'Instrumentação',
      subjectTitle: 'Instrumentação',
      phase: 'focus',
      phaseIndex: 1,
      phaseTotalSeconds: 3000,
      secondsRemaining: 1800,
      isRunning: false,
      isPaused: true,
      phaseStartedAtMs: null,
      accumulatedPhaseSecondsBeforeSlice: 1200,
      soundEnabled: true,
      lastCheckpointAt: 1795800000000,
      completedPhaseEvents: [],
    })
  );

  mockLocalStorage.setItem(
    STORAGE_KEYS.STUDY_RESUME_STATE,
    JSON.stringify({
      dateKey: '2026-11-27',
      blockId: 'blk-1',
      subjectLabel: 'Instrumentação',
      updatedAt: 1795800000000,
    })
  );

  mockLocalStorage.setItem(STORAGE_KEYS.CALENDAR_SELECTED_DATE, '2027-01-12');
  mockLocalStorage.setItem(STORAGE_KEYS.VERTICAL_FILTER_MACRO, 'instrumentacao');
  mockLocalStorage.setItem(STORAGE_KEYS.VERTICAL_FILTER_ORIGEM, 'ambos');
  mockLocalStorage.setItem(STORAGE_KEYS.VERTICAL_FILTER_PRIORIDADE, 'alta');
  mockLocalStorage.setItem(STORAGE_KEYS.VERTICAL_FILTER_STATUS, 'pendente');
  mockLocalStorage.setItem(STORAGE_KEYS.MATERIAL_SELECTED_MODULO, 'modulo_1');
  mockLocalStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'erros');
  mockLocalStorage.setItem(
    STORAGE_KEYS.DRIVE_ENDPOINT,
    'https://script.google.com/macros/s/AKfycbTestScript/exec'
  );
  mockLocalStorage.setItem(STORAGE_KEYS.DRIVE_AUTO_SYNC, 'true');
  mockLocalStorage.setItem(STORAGE_KEYS.DRIVE_AUTO_PUSH, 'true');
  mockLocalStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify(['day-1', 'day-2']));
  mockLocalStorage.setItem(STORAGE_KEYS.COMPLETED_BLOCKS, JSON.stringify(['blk-1']));
  mockLocalStorage.setItem(
    STORAGE_KEYS.BANCA_NOTES,
    JSON.stringify({ cesgranrio: 'Foco em unidades SI e leitura de gráficos.' })
  );
}

test('Teste 1 — Cobertura Completa de Todos os 24 Módulos e Exclusão de Chaves Sensíveis/Recursivas', async () => {
  resetAllTestState();
  seedFullAppData();

  // Adicionar chave extra dinâmica do app + chaves excluídas/sensíveis
  mockLocalStorage.setItem('transpetro_extra_config_v9', JSON.stringify({ tema: 'escuro' }));
  mockLocalStorage.setItem('transpetro_pre_drive_sync_safety_backup_v1', '{"bloat":true}');
  mockLocalStorage.setItem('transpetro_pre_restore_rollback_v1', '{"rollback":true}');
  mockLocalStorage.setItem(
    'transpetro_google_drive_oauth_token_v1',
    JSON.stringify({ accessToken: 'SECRET_TOKEN_SHOULD_NEVER_EXPORT' })
  );
  mockLocalStorage.setItem(STORAGE_KEY_DRIVE_FILE_ID, 'drive_file_123');

  const stages: string[] = [];
  const bundle = await generateValidatedBackupAsync((s) => stages.push(s));

  assert.deepEqual(stages, [
    'preparing',
    'collecting',
    'verifying_modules',
    'validating_integrity',
    'generating_file',
  ]);

  assert.equal(bundle.report.complete, true);
  assert.equal(bundle.report.valid, true);
  assert.equal(bundle.report.totalModulesIdentified, BACKUP_MODULES_REGISTRY.length);
  assert.equal(bundle.report.totalModulesExported, BACKUP_MODULES_REGISTRY.length);
  assert.equal(bundle.report.failedModules.length, 0);
  assert.match(bundle.report.sha256, /^[a-f0-9]{64}$/);

  // Verificar todas as 24 chaves registradas presentes
  for (const mod of BACKUP_MODULES_REGISTRY) {
    assert.ok(
      mod.primaryKey in bundle.payload.data.localStorage,
      `Chave registrada ausente no backup: ${mod.primaryKey}`
    );
  }

  // Verificar chave não-registrada preservada automaticamente
  assert.deepEqual(bundle.payload.data.localStorage['transpetro_extra_config_v9'], {
    tema: 'escuro',
  });

  // Verificar que NENHUMA chave excluída/sensível vazou
  for (const forbidden of EXCLUDED_STORAGE_KEYS) {
    assert.equal(
      forbidden in bundle.payload.data.localStorage,
      false,
      `Chave proibida vazou em localStorage: ${forbidden}`
    );
    assert.equal(
      forbidden in (bundle.payload.data.otherStorageKeys || {}),
      false,
      `Chave proibida vazou em otherStorageKeys: ${forbidden}`
    );
  }
  assert.equal(bundle.jsonString.includes('SECRET_TOKEN_SHOULD_NEVER_EXPORT'), false);
});

test('Teste 2 — Integridade Estrutural (Objetos Aninhados, Base64, Acentuação, Nulos e IDs)', async () => {
  resetAllTestState();
  seedFullAppData();

  const bundle = await generateValidatedBackupAsync();
  const parsed = JSON.parse(bundle.jsonString);

  assert.equal(parsed.metadata.application, 'PETROBRAS - PARETO RECURSIVO');
  assert.equal(parsed.metadata.backupVersion, '2.3');
  assert.equal(parsed.metadata.complete, true);
  assert.equal(
    parsed.data.customMaterials['sec-inst-1'].mindMaps[0].dataUrl,
    'data:image/png;base64,' + 'A'.repeat(2048)
  );
  assert.equal(parsed.data.errorNotebook[0].id, 'err-101');
  assert.match(parsed.data.customMaterials['sec-inst-1'].notes, /pressão manométrica/);
  assert.deepEqual(parsed.data.localStorage[STORAGE_KEYS.ERROR_NOTEBOOK_SIMULATOR], {
    simInst: 82,
    simMec: 76,
    simQui: 88,
    simEle: 70,
    simGerais: 85,
  });
});

test('Teste 3 — Ciclo Completo (Backup -> Clear Total -> Inspeção -> Restauração -> Comparação Profunda)', async () => {
  resetAllTestState();
  seedFullAppData();

  const originalBundle = await generateValidatedBackupAsync();

  // Simular perda total do armazenamento local
  mockLocalStorage.clear();
  assert.equal(mockLocalStorage.length, 0);

  // Etapa 1: Inspeção sem alterar localStorage
  const inspection = await inspectBackupFromJsonString(originalBundle.jsonString);
  assert.equal(inspection.canRestore, true);
  assert.equal(inspection.checksumStatus, 'verified');
  assert.equal(mockLocalStorage.length, 0);

  // Ouvir eventos de restauração reativa
  let storageChangedCount = 0;
  let dataRestoredCount = 0;
  mockWindow.addEventListener('transpetro_storage_changed', () => {
    storageChangedCount += 1;
  });
  mockWindow.addEventListener('transpetro_data_restored', () => {
    dataRestoredCount += 1;
  });

  // Etapa 2: Restauração confirmada
  const restoreRes = await applyInspectedBackupRestore(inspection, {
    preserveCurrentStateInStorage: true,
  });
  assert.equal(restoreRes.success, true);
  assert.equal(restoreRes.rolledBack, false);
  assert.ok(storageChangedCount >= 1);
  assert.ok(dataRestoredCount >= 1);

  // Re-exportar e comparar profundamente cada chave
  const afterBundle = await generateValidatedBackupAsync();
  assert.deepEqual(afterBundle.payload.data.localStorage, originalBundle.payload.data.localStorage);
  assert.deepEqual(afterBundle.report.recordCountsByModule, originalBundle.report.recordCountsByModule);
});

test('Teste 4 — Compatibilidade com Backup Legado v2.2, Remoção de Recursão e Preservação de Campos Desconhecidos', async () => {
  resetAllTestState();

  const legacyV22 = {
    version: '2.2',
    app: 'PETROBRAS - PARETO RECURSIVO',
    exportTimestamp: '2026-10-01T12:00:00.000Z',
    exportDateFormatted: '01/10/2026, 12:00:00',
    unknownFutureHeader: { tag: 'preserve-me-root' },
    data: {
      completedDays: ['2027-01-04'],
      errorNotebook: [
        {
          id: 'legacy-err-1',
          data: '01/10/2026',
          disciplina: 'Química',
          subtopico: 'Termoquímica',
          enunciadoResumido: 'Entalpia padrão.',
          motivoErro: 'Sinal invertido.',
          regraCorreta: 'Exotérmica tem ΔH < 0.',
          revisado: false,
        },
      ],
      verticalSyllabusProgress: {
        'TP-10': { teoria: true, questoes: true, revisao: true, questoesFeitas: 30, questoesAcertos: 27 },
      },
      customMaterials: {},
      materialLinks: [],
      scheduleDayNotes: { '2027-01-04': 'Nota v2.2' },
      otherStorageKeys: {
        transpetro_pre_drive_sync_safety_backup_v1: { recursiveBloat: 'should-be-stripped' },
        transpetro_custom_plugin_flag: 'enabled',
      },
      unknownModuleData2028: { items: ['alpha', 'beta'] },
    },
  };

  const inspection = await inspectBackupObject(legacyV22);
  assert.equal(inspection.detectedVersion, '2.2');
  assert.equal(inspection.migratedFromLegacy, true);
  assert.equal(inspection.checksumStatus, 'not_present');
  assert.equal(inspection.canRestore, true);
  assert.ok(
    inspection.warnings.some((w) => w.includes('transpetro_pre_drive_sync_safety_backup_v1')),
    'Deve alertar sobre limpeza da recursão legada'
  );
  assert.equal(
    'transpetro_pre_drive_sync_safety_backup_v1' in
      (inspection.migratedPayload?.data.localStorage || {}),
    false
  );

  const restoreRes = await applyInspectedBackupRestore(inspection);
  assert.equal(restoreRes.success, true);

  const reexported = await generateValidatedBackupAsync();
  assert.equal(reexported.payload.data.errorNotebook[0].id, 'legacy-err-1');
  assert.equal(reexported.payload.data.localStorage['transpetro_custom_plugin_flag'], 'enabled');
  assert.deepEqual(reexported.payload.data.unknownFields?.unknownModuleData2028, {
    items: ['alpha', 'beta'],
  });
  assert.deepEqual((reexported.payload.data.unknownFields as any)?.__root, {
    unknownFutureHeader: { tag: 'preserve-me-root' },
  });
});

test('Teste 5 — Simulação de Falhas (JSON Corrompido, Tampering SHA-256, QuotaExceededError com Rollback Atômico e Flush de Rascunho)', async () => {
  resetAllTestState();
  seedFullAppData();

  // 5a. Flush de rascunho em memória antes do snapshot
  mockWindow.addEventListener('transpetro_prepare_backup_flush', () => {
    const current = JSON.parse(mockLocalStorage.getItem(STORAGE_KEYS.CUSTOM_MATERIALS) || '{}');
    current['sec-draft'] = { notes: 'Rascunho recém digitado no MindMapSection', mindMaps: [] };
    mockLocalStorage.setItem(STORAGE_KEYS.CUSTOM_MATERIALS, JSON.stringify(current));
  });

  const validBundle = await generateValidatedBackupAsync();
  assert.equal(
    validBundle.payload.data.customMaterials['sec-draft']?.notes,
    'Rascunho recém digitado no MindMapSection'
  );

  // 5b. Tampering / Adulteração detectada via SHA-256
  const tamperedPayload = JSON.parse(validBundle.jsonString);
  tamperedPayload.data.localStorage[STORAGE_KEYS.ERROR_NOTEBOOK][0].regraCorreta = 'ADULTERADO';
  const tamperedInspection = await inspectBackupObject(tamperedPayload);
  assert.equal(tamperedInspection.checksumStatus, 'mismatch');
  assert.equal(tamperedInspection.canRestore, false);
  assert.ok(tamperedInspection.errors.some((e) => e.includes('SHA-256')));

  // 5c. JSON sintaticamente inválido na importação
  const syntaxInspection = await inspectBackupFromJsonString('{ json quebrado');
  assert.equal(syntaxInspection.canRestore, false);
  assert.ok(syntaxInspection.errors[0].includes('JSON inválido'));

  // 5d. Falha no meio da escrita (QuotaExceededError) -> Rollback Atômico garante zero perda
  const beforeErrorNotebook = mockLocalStorage.getItem(STORAGE_KEYS.ERROR_NOTEBOOK);
  const newPayloadToFail = JSON.parse(validBundle.jsonString);
  newPayloadToFail.data.localStorage[STORAGE_KEYS.ERROR_NOTEBOOK] = [
    {
      id: 'new-err-will-rollback',
      data: '28/11/2026',
      disciplina: 'Física',
      subtopico: 'Mecânica',
      enunciadoResumido: 'Teste',
      motivoErro: 'Teste',
      regraCorreta: 'Teste',
      revisado: false,
    },
  ];
  // Remover integrity para simular restauração direta e forçar erro em MATERIAL_LINKS
  delete newPayloadToFail.integrity;
  mockLocalStorage.failOnKey = STORAGE_KEYS.MATERIAL_LINKS;

  const failedRestore = applyBackupRestoreSync(newPayloadToFail);
  mockLocalStorage.failOnKey = null;

  assert.equal(failedRestore.success, false);
  assert.equal(failedRestore.rolledBack, true);
  assert.equal(
    mockLocalStorage.getItem(STORAGE_KEYS.ERROR_NOTEBOOK),
    beforeErrorNotebook,
    'Rollback atômico deve restaurar exatamente os dados anteriores'
  );

  // 5e. Dado corrompido no localStorage deve bloquear a exportação
  mockLocalStorage.setItem(STORAGE_KEYS.ERROR_NOTEBOOK, '{corrompido');
  await assert.rejects(() => generateValidatedBackupAsync(), /corrompido/i);
});

test('Teste 6 — Google Drive Sync & Apps Script (Rejeição HTML 200, FileId sem Duplicatas, Aborta Missing ID e Merge)', async () => {
  resetAllTestState();
  seedFullAppData();

  const endpoint = 'https://script.google.com/macros/s/AKfycbRealTest/exec';

  // 6a. Rejeitar falso-positivo quando Apps Script devolve página HTML 200
  (globalThis as any).fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '<!DOCTYPE html><html><body>Google Sign In</body></html>',
  });

  await assert.rejects(
    () => pushBackupToGoogleDrive(endpoint),
    /não-JSON|Código\.gs atualizado/i
  );

  // 6b. Upload bem-sucedido salva fileId e reutiliza no próximo push
  const postedBodies: any[] = [];
  (globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
    postedBodies.push(JSON.parse(String(init?.body || '{}')));
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          fileId: 'drive-id-999',
          fileName: BACKUP_FILE_NAME,
          folder: GOOGLE_DRIVE_BACKUP_FOLDER,
          message: 'Atualizado!',
        }),
    };
  };

  const firstPush = await pushBackupToGoogleDrive(endpoint);
  assert.equal(firstPush.success, true);
  assert.equal(getDriveFileId(), 'drive-id-999');
  assert.equal(postedBodies[0].targetFileId, null);
  assert.equal(postedBodies[0].allowCreateIfMissing, true);
  assert.equal(postedBodies[0].expectedFileName, 'PLATAFORMA TRANSPETRO.json');
  assert.equal(postedBodies[0].expectedFolder, 'backups');

  const secondPush = await pushBackupToGoogleDrive(endpoint);
  assert.equal(secondPush.success, true);
  assert.equal(postedBodies[1].targetFileId, 'drive-id-999');
  assert.equal(postedBodies[1].allowCreateIfMissing, false);

  // 6c. Drive API REST: abortar se existingFileId não existe (404) sem criar duplicata via POST
  mockSessionStorage.setItem(
    'transpetro_google_drive_oauth_token_v1',
    JSON.stringify({ token: 'fake-oauth-token-for-test', expiresAt: Date.now() + 3600_000 })
  );
  let postCreateCalled = false;
  (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') postCreateCalled = true;
    if (url.includes('/missing-id-404')) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'File not found' } }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ id: 'should-not-happen' }) };
  };

  await assert.rejects(
    () => saveBackupToDriveApi('missing-id-404', { allowCreateIfMissing: false }),
    /evitar duplicatas|não foi encontrado/i
  );
  assert.equal(postCreateCalled, false);

  // 6d. Drive API REST: atualizar em-loco com PATCH mantendo ID original
  let patchCalled = false;
  (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    if (method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'drive-id-999', name: BACKUP_FILE_NAME, trashed: false }),
      };
    }
    if (method === 'PATCH' && url.includes('uploadType=multipart')) {
      patchCalled = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'drive-id-999', name: BACKUP_FILE_NAME }),
      };
    }
    throw new Error(`Unexpected fetch ${method} ${url}`);
  };

  const patched = await saveBackupToDriveApi('drive-id-999');
  assert.equal(patchCalled, true);
  assert.equal(patched.id, 'drive-id-999');

  // 6e. Merge bidirecional preserva registros de ambos os lados sem sobrescrever edital
  const localPayload = generateCompleteBackupSync().payload;
  const remotePayload = {
    version: '2.3',
    data: {
      errorNotebook: [
        {
          id: 'err-remote-202',
          data: '26/11/2026',
          disciplina: 'Eletricidade',
          subtopico: 'Motores de Indução',
          enunciadoResumido: 'Escorregamento.',
          motivoErro: 'Fórmula.',
          regraCorreta: 's = (ns - n) / ns.',
          revisado: false,
        },
      ],
      verticalSyllabusProgress: {
        'TP-01': { teoria: true, questoes: true, revisao: true, questoesFeitas: 60, questoesAcertos: 50 },
      },
    },
  };
  const merged = mergeTranspetroBackupData(localPayload, remotePayload);
  assert.equal(merged.data.errorNotebook.length, 3);
  assert.equal(merged.data.verticalSyllabusProgress['TP-01'].questoesFeitas, 60);
  assert.equal(merged.data.verticalSyllabusProgress['TP-01'].revisao, true);

  // 6f. Template do Apps Script contém conta, pasta e proteção FILE_NOT_FOUND
  const scriptTpl = getGoogleAppsScriptTemplate();
  assert.ok(scriptTpl.includes(GOOGLE_DRIVE_ACCOUNT_EMAIL));
  assert.ok(scriptTpl.includes(GOOGLE_DRIVE_BACKUP_FOLDER));
  assert.ok(scriptTpl.includes('PLATAFORMA TRANSPETRO.json'));
  assert.ok(scriptTpl.includes('FILE_NOT_FOUND'));
});

test('Teste 7 — Regressão Geral (Nome do Arquivo, Estatísticas e Rollback Pré-Restauração Manual)', async () => {
  resetAllTestState();
  seedFullAppData();

  assert.equal(BACKUP_FILE_NAME, 'PLATAFORMA TRANSPETRO.json');
  const stats = getBackupStats();
  assert.equal(stats.errorNotebookCount, 2);
  assert.equal(stats.verticalTopicsCount, 2);
  assert.equal(stats.materialLinksCount, 1);
  assert.equal(stats.focusLogsCount, 1);
  assert.equal(stats.totalModules, BACKUP_MODULES_REGISTRY.length);

  // Salvar snapshot A e restaurar snapshot B diferente com preserveCurrentStateInStorage=true
  const snapB = {
    version: '2.2',
    data: {
      completedDays: [],
      errorNotebook: [],
      verticalSyllabusProgress: {},
      customMaterials: {},
      materialLinks: [],
      scheduleDayNotes: {},
    },
  };

  const resB = applyBackupRestoreSync(snapB, { preserveCurrentStateInStorage: true });
  assert.equal(resB.success, true);
  assert.equal(getBackupStats().errorNotebookCount, 0);

  // Reverter para o estado anterior (snapshot A) usando restorePreRestoreRollbackSnapshot
  const undoRes = restorePreRestoreRollbackSnapshot();
  assert.equal(undoRes.success, true);
  assert.equal(getBackupStats().errorNotebookCount, 2);
  assert.equal(getBackupStats().verticalTopicsCount, 2);
});

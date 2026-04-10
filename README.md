# Kanban Board / Канбан-доска

[English](#english) · [Русский](#русский)

---

## English

### Supabase Integration

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase-schema.sql` from this repository.
3. Copy `.env.example` to `.env.local` and fill values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Start app with `npm run dev`.

### Security Migration (Auth + RLS owner/team)

For an existing Supabase project, additionally run:

- `supabase-migration-auth-rls-owner-team.sql`
- `supabase-migration-storage-avatars.sql`
- `supabase-migration-soft-delete.sql`
- `supabase-migration-projects.sql`

### Members management (detailed list + safe removal)

After project roles are in place, apply:

- `supabase-migration-project-members-detailed.sql` — RPC `list_project_members_detailed` (name + email in UI)
- `supabase-migration-remove-project-member.sql` — RPC `remove_project_member` (admin-only, owner protected)

Then run `notify pgrst, 'reload schema';` (or wait for PostgREST cache refresh).

See `MEMBERS_RELEASE_CHECKLIST.md` for rollout order and smoke tests.

### Backup and restore

- In board header use `Экспорт JSON` to download a backup.
- Use `Импорт JSON` to restore from backup file.
- Import uses soft-delete for current active data and then upserts backup records.

If env variables are missing, app startup throws an explicit configuration error.

---

## Русский

### Интеграция с Supabase

1. Создайте проект в Supabase.
2. В SQL Editor выполните из репозитория файл `supabase-schema.sql`.
3. Скопируйте `.env.example` в `.env.local` и укажите значения:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Запуск: `npm run dev`.

### Миграции безопасности (Auth + RLS, владелец/команда)

Для уже существующего проекта Supabase дополнительно выполните:

- `supabase-migration-auth-rls-owner-team.sql`
- `supabase-migration-storage-avatars.sql`
- `supabase-migration-soft-delete.sql`
- `supabase-migration-projects.sql`

### Участники проекта (список с именем/email и удаление)

После настройки ролей в проекте выполните:

- `supabase-migration-project-members-detailed.sql` — RPC `list_project_members_detailed` (имя и email в интерфейсе)
- `supabase-migration-remove-project-member.sql` — RPC `remove_project_member` (только админ, владельца удалить нельзя)

Затем выполните `notify pgrst, 'reload schema';` (или подождите обновления кэша PostgREST).

Порядок выката и сценарии проверки — в `MEMBERS_RELEASE_CHECKLIST.md`.

### Резервное копирование и восстановление

- В шапке доски: `Экспорт JSON` — скачать бэкап.
- `Импорт JSON` — восстановить из файла бэкапа.
- Импорт помечает текущие активные данные как soft-deleted и затем подставляет записи из бэкапа.

Если переменные окружения не заданы, при старте приложения будет явная ошибка конфигурации.

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

### Шаблон Vite (кратко по-русски)

Ниже — стандартный блок шаблона Create Vite: минимальная настройка React + TypeScript с HMR и примерами расширения ESLint. Подробности и ссылки на плагины — в английском тексте выше; примеры конфигурации в кодовых блоках общие для любого языка README.

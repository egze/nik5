# Lernraum

## Deutsch: So lernst du

1. Öffne die Seite und gib die Familien-PIN ein. Tippe dann auf **Öffnen**.
2. Wähle bei **Fächer** das Fach **Spanisch** und danach die Lektion **Begrüßen und vorstellen**.
3. Wähle eine Übungsart:
   - **Lernen**: Karten ansehen, die Antwort aufdecken und mit **Kann ich** oder **Noch üben** einschätzen.
   - **Multiple Choice**: Die passende Übersetzung auswählen.
   - **Schreiben**: Die Übersetzung selbst eingeben.
   - **Prüfung**: Alle Wörter der Lektion ohne direkte Hinweise beantworten.
4. Dein Fortschritt, offene Übungen und Prüfungsergebnisse bleiben nur in diesem Browser auf diesem Gerät gespeichert. Es gibt kein Konto und keine Synchronisierung.
5. Wähle **Abmelden**, wenn die nächste Person wieder die PIN eingeben soll.

Wenn Browserdaten für diese Website gelöscht werden, werden auch der gespeicherte Fortschritt und die entsperrte Sitzung gelöscht.

### Wichtiger Hinweis zur PIN

Die PIN ist nur eine Zugangshürde für den Familienalltag, keine sichere Anmeldung. Die Seite ist statisch: Ihre Vokabelinhalte bleiben trotz PIN-Bildschirm öffentlich abrufbar. Speichere deshalb keine sensiblen oder persönlichen Daten in Lernraum.

## Русский: для владельца сайта

1. Создайте публичный репозиторий GitHub и отправьте ветку `main` командой push.
2. Откройте `Settings → Pages → Build and deployment → GitHub Actions`.
3. Дождитесь успешного завершения `Deploy Lernraum to Pages` и откройте URL развёртывания из этого запуска.
4. Присылайте будущие фотографии заданий для расшифровки в новый файл урока.
5. Перед push выполняйте `npm install`, `npm run validate`, `npm test` и `npm run build`.
6. Меняйте семейный PIN локально командой `npm run set-pin`, коммитьте только `src/auth/pin-config.ts` и никогда не вводите пароль от учётной записи в этот скрипт.

### Предупреждение о безопасности

Экран PIN — это только бытовой барьер, а не защита данных. Сайт статический, поэтому содержимое уроков остаётся публично доступным и может быть получено даже при наличии PIN-экрана. Не храните в репозитории или на сайте личные и чувствительные данные.

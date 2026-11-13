on isRunning(svc)
	try
		do shell script "launchctl print " & svc & " | grep -q 'state = running'"
		return true
	on error
		return false
	end try
end isRunning

on showMessage(msg)
	display dialog msg buttons {"Tamam"} default button "Tamam" with title "Telegram Claude" giving up after 5
end showMessage

activate
set uid to do shell script "id -u"
set svc to "gui/" & uid & "/com.hootbu.telegram-router"
set plist to POSIX path of (path to home folder) & "Library/LaunchAgents/com.hootbu.telegram-router.plist"

if isRunning(svc) then
	set answer to button returned of (display dialog "Telegram Claude çalışıyor. Durdurursan bot cevap vermez, yarıda kalan iş varsa kesilir." buttons {"Vazgeç", "Durdur"} default button "Vazgeç" with title "Telegram Claude")
	if answer is "Durdur" then
		do shell script "launchctl disable " & svc & "; launchctl bootout " & svc & " 2>/dev/null; true"
		showMessage("Durduruldu. Açmak için simgeye tekrar çift tıkla.")
	end if
else
	do shell script "launchctl enable " & svc & "; launchctl bootstrap gui/" & uid & " " & quoted form of plist & " 2>/dev/null; launchctl kickstart " & svc & " 2>/dev/null; sleep 2; true"
	if isRunning(svc) then
		showMessage("Başlatıldı.")
	else
		display alert "Telegram Claude başlatılamadı" message "Ayrıntı: ~/Library/Logs/hootbu-telegram-router.log"
	end if
end if

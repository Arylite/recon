package re.isx.valoalert

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

private const val CHANNEL = "alerts"

// 15 minutes is the WorkManager minimum; the store only changes once a day so that is plenty.
fun scheduleAlerts(context: Context) {
    val request =
        PeriodicWorkRequestBuilder<AlertWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork("alerts", ExistingPeriodicWorkPolicy.KEEP, request)
}

class AlertWorker(
    private val context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val prefs = Prefs(context)
        val api = prefs.api() ?: return Result.success()
        return try {
            // Keeps the skin catalog (names, art, tiers) fresh even if the app is never opened.
            withContext(Dispatchers.IO) { CatalogCache.refresh(context, api) }
            val alerts = withContext(Dispatchers.IO) { api.alerts(maxOf(prefs.lastAlertId, 0)) }
            // First poll after setup: remember the position instead of replaying old alerts.
            if (prefs.lastAlertId >= 0) alerts.forEach(::show)
            prefs.lastAlertId = maxOf(prefs.lastAlertId, alerts.maxOfOrNull { it.id } ?: 0)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun show(alert: Alert) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Store alerts", NotificationManager.IMPORTANCE_HIGH))
        val open =
            PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE,
            )
        val notification =
            Notification
                .Builder(context, CHANNEL)
                .setSmallIcon(android.R.drawable.star_on)
                .setContentTitle(alert.skin)
                .setContentText("In the store of ${alert.account}")
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        nm.notify(alert.id.toInt(), notification)
    }
}

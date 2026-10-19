# WorkManager builds its Room database by reflection, so R8 must keep the generated constructor.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
# The worker is instantiated by WorkManager through reflection too.
-keep class re.isx.valoalert.AlertWorker { *; }

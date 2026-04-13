import { Play, Wrench } from "lucide-react";

export function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
      </div>

      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
        <Wrench className="w-7 h-7 text-amber-600" />
      </div>

      <h1 className="text-2xl font-display font-bold text-foreground mb-3">
        Under Maintenance
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        TubeVox is currently undergoing scheduled maintenance. We'll be back
        online shortly. Thank you for your patience.
      </p>
    </div>
  );
}

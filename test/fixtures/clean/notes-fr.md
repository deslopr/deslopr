# Migration vers la version 2

La version 2 synchronise les agendas Outlook dans les deux sens. Avant, une modification faite dans Outlook mettait jusqu'à quinze minutes à apparaître ; elle arrive maintenant en moins de trente secondes.

Pour migrer, lancez `flowsync migrate` une fois par espace de travail. Comptez une minute pour mille utilisateurs. La commande peut être relancée sans risque : si elle échoue en cours de route, l'ancienne synchronisation continue de tourner.

Ce n'est pas encore parfait. Les événements récurrents créés avant 2019 perdent parfois leurs exceptions à la première synchronisation. Si ça vous arrive, enregistrez la série une fois dans Google Agenda, et écrivez-nous à support@flowsync.example avec l'identifiant de l'événement.

— Bonne migration, dit Marta.
— Et prévenez-nous si quelque chose casse, ajoute Ivo.

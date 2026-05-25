import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { useCurrentLocation } from "../hooks/useLocation";
import { colors } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "AddAddress">;

// مركز افتراضي: الجزائر العاصمة، يتمّ استبداله بموقع المستخدم حين يصلنا
const DEFAULT_REGION: Region = {
  latitude: 36.7538,
  longitude: 3.0588,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function AddAddressScreen({ navigation }: Props) {
  const loc = useCurrentLocation();
  const queryClient = useQueryClient();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [label, setLabel] = useState("المنزل");
  const [details, setDetails] = useState("");

  // عند معرفة موقع المستخدم، نمرّ المركز إليه
  useEffect(() => {
    if (loc.location) {
      setRegion((r) => ({
        ...r,
        latitude: loc.location!.lat,
        longitude: loc.location!.lng,
      }));
    }
  }, [loc.location]);

  const create = useMutation({
    mutationFn: () =>
      addressesApi.create({
        label,
        details: details || null,
        lat: region.latitude,
        lng: region.longitude,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert("تعذّر الحفظ", (e as Error).message),
  });

  return (
    <Screen padded={false}>
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
        </MapView>
        <Text style={styles.hint}>حرّك الخريطة لضبط الدبّوس على باب منزلك</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="اسم العنوان"
          value={label}
          onChangeText={setLabel}
          placeholder="مثال: المنزل، العمل"
          maxLength={60}
        />
        <Input
          label="تفاصيل إضافية"
          value={details}
          onChangeText={setDetails}
          placeholder="رقم العمارة، الطابق، أيّ علامة مميّزة..."
          maxLength={255}
        />
        <Button label="حفظ العنوان" onPress={() => create.mutate()} loading={create.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1, position: "relative" },
  map: { flex: 1 },
  hint: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    textAlign: "center",
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
  },
  form: { padding: 16, gap: 12, backgroundColor: colors.background },
});
